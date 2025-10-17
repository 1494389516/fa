use actix_web::{web, App, HttpResponse, HttpServer, Result};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use ort::{Environment, SessionBuilder, Value};

/// 检测请求
#[derive(Debug, Deserialize)]
struct DetectionRequest {
    user_id: String,
    item_id: Option<String>,
    amount: Option<f64>,
    timestamp: Option<f64>,
    ip: Option<String>,
    device_id: Option<String>,
    action: Option<String>,
}

/// 检测响应
#[derive(Debug, Serialize)]
struct DetectionResponse {
    user_id: String,
    risk_score: f64,
    risk_level: String,
    fraud_probability: f64,
    detected_patterns: Vec<String>,
    defense_layers: Vec<u8>,
    timestamp: f64,
    response_time_ms: f64,
    processed_by: String,
}

/// 风险等级
#[derive(Debug)]
enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl RiskLevel {
    fn from_score(score: f64) -> Self {
        match score {
            s if s < 0.3 => RiskLevel::Low,
            s if s < 0.6 => RiskLevel::Medium,
            s if s < 0.85 => RiskLevel::High,
            _ => RiskLevel::Critical,
        }
    }

    fn as_str(&self) -> &str {
        match self {
            RiskLevel::Low => "LOW",
            RiskLevel::Medium => "MEDIUM",
            RiskLevel::High => "HIGH",
            RiskLevel::Critical => "CRITICAL",
        }
    }
}

/// ONNX 模型推理器
struct ONNXDetector {
    // ONNX模型会话
    // session: Session,
}

impl ONNXDetector {
    fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // 简化实现 - 实际应该加载ONNX模型
        // let environment = Environment::builder()
        //     .with_name("fraud_detection")
        //     .build()?;
        
        // let session = SessionBuilder::new(&environment)?
        //     .with_model_from_file("models/gnn_model.onnx")?;

        Ok(ONNXDetector {
            // session,
        })
    }

    /// 使用ONNX模型进行推理
    fn predict(&self, features: &[f32]) -> Result<f64, Box<dyn std::error::Error>> {
        // 简化实现 - 模拟推理
        // 实际应该：
        // 1. 构建输入张量
        // 2. 执行模型推理
        // 3. 解析输出

        // 模拟快速推理（2ms内完成）
        let fraud_prob = 0.35; // 示例值
        
        Ok(fraud_prob)
    }
}

/// 实时检测器
struct RealtimeDetector {
    onnx_detector: ONNXDetector,
    stats: Arc<Mutex<DetectorStats>>,
}

/// 统计信息
struct DetectorStats {
    total_requests: u64,
    fraud_detected: u64,
    total_response_time: f64,
}

impl RealtimeDetector {
    fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(RealtimeDetector {
            onnx_detector: ONNXDetector::new()?,
            stats: Arc::new(Mutex::new(DetectorStats {
                total_requests: 0,
                fraud_detected: 0,
                total_response_time: 0.0,
            })),
        })
    }

    /// 执行检测
    fn detect(&self, req: &DetectionRequest) -> DetectionResponse {
        let start = Instant::now();

        // 提取特征（简化）
        let features = self.extract_features(req);

        // ONNX模型推理
        let fraud_prob = self.onnx_detector.predict(&features).unwrap_or(0.5);

        // 规则检测
        let (detected_patterns, defense_layers) = self.rule_based_detection(req);

        // 计算风险评分
        let risk_score = self.calculate_risk_score(fraud_prob, &detected_patterns);

        // 确定风险等级
        let risk_level = RiskLevel::from_score(risk_score);

        // 计算响应时间
        let response_time = start.elapsed().as_secs_f64() * 1000.0;

        // 更新统计
        self.update_stats(response_time, &risk_level);

        DetectionResponse {
            user_id: req.user_id.clone(),
            risk_score,
            risk_level: risk_level.as_str().to_string(),
            fraud_probability: fraud_prob,
            detected_patterns,
            defense_layers,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs_f64(),
            response_time_ms: response_time,
            processed_by: "rust_detector".to_string(),
        }
    }

    /// 提取特征
    fn extract_features(&self, req: &DetectionRequest) -> Vec<f32> {
        // 简化实现 - 实际应该提取完整的特征向量
        vec![0.1, 0.2, 0.3, 0.4, 0.5]
    }

    /// 基于规则的检测
    fn rule_based_detection(&self, req: &DetectionRequest) -> (Vec<String>, Vec<u8>) {
        let mut patterns = Vec::new();
        let mut layers = Vec::new();

        // 规则1：高额交易
        if let Some(amount) = req.amount {
            if amount > 1000.0 {
                patterns.push("HIGH_AMOUNT".to_string());
                layers.push(1);
            }
        }

        // 规则2：时间异常
        if let Some(ts) = req.timestamp {
            let hour = (ts as i64 % 86400) / 3600;
            if hour >= 2 && hour <= 5 {
                patterns.push("TIME_ANOMALY".to_string());
                layers.push(4);
            }
        }

        (patterns, layers)
    }

    /// 计算风险评分
    fn calculate_risk_score(&self, fraud_prob: f64, patterns: &[String]) -> f64 {
        let base_score = fraud_prob;
        let pattern_penalty = patterns.len() as f64 * 0.1;
        (base_score + pattern_penalty).min(1.0)
    }

    /// 更新统计
    fn update_stats(&self, response_time: f64, risk_level: &RiskLevel) {
        if let Ok(mut stats) = self.stats.lock() {
            stats.total_requests += 1;
            stats.total_response_time += response_time;

            if matches!(risk_level, RiskLevel::High | RiskLevel::Critical) {
                stats.fraud_detected += 1;
            }
        }
    }

    /// 获取统计信息
    fn get_stats(&self) -> Option<DetectorStats> {
        self.stats.lock().ok().map(|s| DetectorStats {
            total_requests: s.total_requests,
            fraud_detected: s.fraud_detected,
            total_response_time: s.total_response_time,
        })
    }
}

/// API 处理函数

/// 检测接口
async fn detect(
    detector: web::Data<RealtimeDetector>,
    req: web::Json<DetectionRequest>,
) -> Result<HttpResponse> {
    let response = detector.detect(&req);
    Ok(HttpResponse::Ok().json(response))
}

/// 健康检查
async fn health() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "rust_detector"
    })))
}

/// 统计信息
async fn stats(detector: web::Data<RealtimeDetector>) -> Result<HttpResponse> {
    if let Some(stats) = detector.get_stats() {
        let avg_response_time = if stats.total_requests > 0 {
            stats.total_response_time / stats.total_requests as f64
        } else {
            0.0
        };

        let fraud_rate = if stats.total_requests > 0 {
            stats.fraud_detected as f64 / stats.total_requests as f64
        } else {
            0.0
        };

        Ok(HttpResponse::Ok().json(serde_json::json!({
            "total_requests": stats.total_requests,
            "fraud_detected": stats.fraud_detected,
            "fraud_rate": fraud_rate,
            "avg_response_time_ms": avg_response_time,
        })))
    } else {
        Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to get stats"
        })))
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("==============================================");
    println!("⚡ Rust 实时欺诈检测器");
    println!("极致性能 | 毫秒级响应 | ONNX推理");
    println!("==============================================");

    // 初始化检测器
    let detector = match RealtimeDetector::new() {
        Ok(d) => {
            println!("✅ 检测器初始化成功");
            web::Data::new(d)
        }
        Err(e) => {
            eprintln!("❌ 检测器初始化失败: {}", e);
            return Ok(());
        }
    };

    let port = 3030;
    println!("\n🚀 服务器启动在端口 {}", port);
    println!("📡 检测接口: http://localhost:{}/detect", port);
    println!("💊 健康检查: http://localhost:{}/health", port);
    println!("📊 统计信息: http://localhost:{}/stats", port);
    println!("\n等待请求...\n");

    HttpServer::new(move || {
        App::new()
            .app_data(detector.clone())
            .route("/detect", web::post().to(detect))
            .route("/health", web::get().to(health))
            .route("/stats", web::get().to(stats))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}

