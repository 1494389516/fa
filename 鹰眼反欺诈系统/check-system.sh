#!/bin/bash

# 系统快速检查脚本
# 检查所有组件是否正确配置

echo "=========================================="
echo "🔍 实时反欺诈系统 - 快速检查"
echo "=========================================="
echo ""

PASS=0
FAIL=0
WARN=0

# 检查函数
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $2"
        ((PASS++))
        return 0
    else
        echo "❌ $2 - 缺失: $1"
        ((FAIL++))
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $2"
        ((PASS++))
        return 0
    else
        echo "⚠️  $2 - 缺失: $1"
        ((WARN++))
        return 1
    fi
}

check_command() {
    if command -v $1 &> /dev/null; then
        echo "✅ $1 已安装: $(command -v $1)"
        ((PASS++))
        return 0
    else
        echo "❌ $1 未安装"
        ((FAIL++))
        return 1
    fi
}

echo "📋 检查必需文件..."
echo "===================="
check_file "README.md" "项目说明文件"
check_file "requirements.txt" "Python依赖文件"
check_file "docker-compose.yml" "Docker配置文件"
check_file "config/config.yaml" "系统配置文件"
check_file "gateway/go.mod" "Go模块配置"
check_file "gateway/main.go" "Go网关代码"
check_file "core/fraud_detection_engine.py" "Python核心引擎"
check_file "rust_detector/Cargo.toml" "Rust配置文件"
check_file "rust_detector/src/main.rs" "Rust检测器代码"
check_file "frontend/package.json" "前端配置文件"
check_file "frontend/src/App.jsx" "前端主组件"
check_file "scripts/init.sql" "数据库初始化脚本"
check_file "monitoring/prometheus.yml" "Prometheus配置"

echo ""
echo "📁 检查目录结构..."
echo "===================="
check_dir "core" "Python核心目录"
check_dir "gateway" "Go网关目录"
check_dir "rust_detector" "Rust检测器目录"
check_dir "frontend" "前端目录"
check_dir "config" "配置目录"
check_dir "docker" "Docker目录"
check_dir "scripts" "脚本目录"
check_dir "monitoring" "监控目录"
check_dir "models" "模型目录"
check_dir "logs" "日志目录"

echo ""
echo "🛠️  检查开发工具..."
echo "===================="
check_command "python3"
check_command "go"
check_command "cargo"
check_command "node"
check_command "npm"
check_command "docker"
check_command "docker-compose"

echo ""
echo "🔍 检查Python依赖..."
echo "===================="
if command -v python3 &> /dev/null; then
    python3 -c "import torch" 2>/dev/null && echo "✅ PyTorch 已安装" && ((PASS++)) || echo "❌ PyTorch 未安装" && ((FAIL++))
    python3 -c "import redis" 2>/dev/null && echo "✅ redis 已安装" && ((PASS++)) || echo "❌ redis 未安装" && ((FAIL++))
    python3 -c "import psycopg2" 2>/dev/null && echo "✅ psycopg2 已安装" && ((PASS++)) || echo "❌ psycopg2 未安装" && ((FAIL++))
fi

echo ""
echo "📊 检查端口占用..."
echo "===================="
check_port() {
    if lsof -i :$1 &> /dev/null; then
        echo "✅ 端口 $1 已被占用 - $2 可能正在运行"
        ((PASS++))
    else
        echo "⚠️  端口 $1 未被占用 - $2 未运行"
        ((WARN++))
    fi
}

check_port 8080 "Go API网关"
check_port 3030 "Rust检测器"
check_port 3000 "前端服务"
check_port 6379 "Redis"
check_port 5432 "PostgreSQL"

echo ""
echo "=========================================="
echo "📈 检查结果汇总"
echo "=========================================="
echo "✅ 通过: $PASS"
echo "❌ 失败: $FAIL"
echo "⚠️  警告: $WARN"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 所有核心检查都通过了！"
    echo ""
    echo "下一步："
    echo "1. 如果依赖未安装，运行: pip install -r requirements.txt"
    echo "2. 启动服务: ./start_all.sh"
    echo "3. 运行测试: python3 test_detection.py"
else
    echo "⚠️  发现 $FAIL 个问题需要修复"
    echo ""
    echo "请参考 检查和修复脚本.md 文件解决问题"
fi

echo ""
echo "详细信息请查看:"
echo "- 📖 快速使用指南.md"
echo "- 🔧 检查和修复脚本.md"
echo "- 📊 系统问题检查报告.md"
echo "=========================================="

