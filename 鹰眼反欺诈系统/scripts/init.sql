-- 实时反欺诈系统数据库初始化脚本
-- PostgreSQL 15+

-- 创建检测结果表
CREATE TABLE IF NOT EXISTS fraud_detection_results (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    risk_score DECIMAL(5,3) NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    fraud_probability DECIMAL(5,3) NOT NULL,
    detected_patterns JSONB,
    defense_layers JSONB,
    response_time_ms DECIMAL(10,2),
    processed_by VARCHAR(50),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_id ON fraud_detection_results(user_id);
CREATE INDEX IF NOT EXISTS idx_timestamp ON fraud_detection_results(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_level ON fraud_detection_results(risk_level);
CREATE INDEX IF NOT EXISTS idx_created_at ON fraud_detection_results(created_at DESC);

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    credit_score INTEGER DEFAULT 75 CHECK (credit_score >= 0 AND credit_score <= 100),
    risk_score DECIMAL(5,3) DEFAULT 0.000 CHECK (risk_score >= 0 AND risk_score <= 1),
    total_transactions INTEGER DEFAULT 0,
    fraud_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_risk_score ON users(risk_score DESC);

-- 创建IP黑名单表
CREATE TABLE IF NOT EXISTS ip_blacklist (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    reason TEXT,
    added_by VARCHAR(100),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON ip_blacklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_expires ON ip_blacklist(expires_at);

-- 创建设备指纹表
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255),
    is_suspicious BOOLEAN DEFAULT FALSE,
    fraud_count INTEGER DEFAULT 0,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_device_id ON device_fingerprints(device_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user_id ON device_fingerprints(user_id);

-- 创建统计视图
CREATE OR REPLACE VIEW fraud_statistics AS
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as total_requests,
    SUM(CASE WHEN risk_level IN ('HIGH', 'CRITICAL') THEN 1 ELSE 0 END) as fraud_detected,
    AVG(risk_score) as avg_risk_score,
    AVG(response_time_ms) as avg_response_time,
    MAX(response_time_ms) as max_response_time,
    MIN(response_time_ms) as min_response_time
FROM fraud_detection_results
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- 创建每小时统计视图
CREATE OR REPLACE VIEW hourly_statistics AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as total_requests,
    SUM(CASE WHEN risk_level IN ('HIGH', 'CRITICAL') THEN 1 ELSE 0 END) as fraud_detected,
    AVG(risk_score) as avg_risk_score
FROM fraud_detection_results
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- 创建风险等级分布视图
CREATE OR REPLACE VIEW risk_level_distribution AS
SELECT 
    risk_level,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM fraud_detection_results
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY risk_level
ORDER BY 
    CASE risk_level
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
    END;

-- 创建触发器函数：更新用户统计
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新或插入用户统计
    INSERT INTO users (user_id, total_transactions, fraud_count, risk_score, updated_at)
    VALUES (
        NEW.user_id,
        1,
        CASE WHEN NEW.risk_level IN ('HIGH', 'CRITICAL') THEN 1 ELSE 0 END,
        NEW.risk_score,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_transactions = users.total_transactions + 1,
        fraud_count = users.fraud_count + CASE WHEN NEW.risk_level IN ('HIGH', 'CRITICAL') THEN 1 ELSE 0 END,
        risk_score = NEW.risk_score,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_user_stats ON fraud_detection_results;
CREATE TRIGGER trigger_update_user_stats
    AFTER INSERT ON fraud_detection_results
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

-- 插入测试数据（可选）
INSERT INTO ip_blacklist (ip_address, reason, added_by) VALUES
    ('192.168.1.1', '测试黑名单IP', 'system')
ON CONFLICT (ip_address) DO NOTHING;

-- 添加表注释
COMMENT ON TABLE fraud_detection_results IS '欺诈检测结果记录表';
COMMENT ON TABLE users IS '用户信息和统计表';
COMMENT ON TABLE ip_blacklist IS 'IP黑名单表';
COMMENT ON TABLE device_fingerprints IS '设备指纹表';

COMMENT ON VIEW fraud_statistics IS '每日欺诈统计视图';
COMMENT ON VIEW hourly_statistics IS '每小时欺诈统计视图';
COMMENT ON VIEW risk_level_distribution IS '风险等级分布视图（最近24小时）';

-- 显示创建成功信息
DO $$
BEGIN
    RAISE NOTICE '✅ 数据库初始化完成！';
    RAISE NOTICE '表: fraud_detection_results, users, ip_blacklist, device_fingerprints';
    RAISE NOTICE '视图: fraud_statistics, hourly_statistics, risk_level_distribution';
    RAISE NOTICE '触发器: trigger_update_user_stats';
END $$;

