#!/bin/bash

echo "=========================================="
echo "🎨 启动实时反欺诈监控面板"
echo "前端开发服务器"
echo "=========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    echo "请访问 https://nodejs.org 安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"
echo ""

# 进入前端目录
cd frontend

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
    echo ""
fi

echo "🚀 启动开发服务器..."
echo ""
echo "访问地址:"
echo "  本地: http://localhost:3000"
echo "  网络: http://$(ipconfig getifaddr en0):3000"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

npm run dev
