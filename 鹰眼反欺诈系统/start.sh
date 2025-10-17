#!/bin/bash
# 🦅 鹰眼反欺诈系统 - 一键启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
cat << "EOF"
  _____ _   _ _   _ ____  ____  _   _   _    _    ____  _  __
 |  ___| | | | | | / __ \|  _ \| | | | / \  | |  | __ )| |/ /
 | |_  | |_| | | | | |  || |_) | |_| |/ _ \ | |  |  _ \| ' / 
 |  _| |  _  | |_| | |__|| | | |  _  / ___ \| |__| |_) | . \ 
 |_|   |_| |_|\___/ \____/|_| |_|_| |_/ __\_\|____|____/|_|\_\
                                        /_/                    
 🦅 鹰眼反欺诈系统 FraudHawk - AI Powered Fraud Detection
EOF
echo -e "${NC}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}▶ 系统启动中...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 检测Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker未安装，请先安装Docker${NC}"
    exit 1
fi

# 检测Docker Compose
COMPOSE_CMD=""
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
    echo -e "${GREEN}✓ 检测到 Docker Compose Plugin${NC}"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    echo -e "${GREEN}✓ 检测到 Docker Compose${NC}"
else
    echo -e "${RED}✗ Docker Compose未安装${NC}"
    exit 1
fi

# 停止旧容器
echo -e "\n${YELLOW}► 清理旧容器...${NC}"
$COMPOSE_CMD down 2>/dev/null || true

# 构建镜像
echo -e "\n${YELLOW}► 构建镜像...${NC}"
$COMPOSE_CMD build --no-cache

# 启动服务
echo -e "\n${YELLOW}► 启动服务...${NC}"
$COMPOSE_CMD up -d

# 等待服务就绪
echo -e "\n${YELLOW}► 等待服务启动...${NC}"
sleep 5

# 显示状态
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ 服务状态:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
$COMPOSE_CMD ps

# 获取IP地址
if command -v ip &> /dev/null; then
    SERVER_IP=$(ip route get 1 | awk '{print $7}' | head -1)
elif command -v ifconfig &> /dev/null; then
    SERVER_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
else
    SERVER_IP="localhost"
fi

# 显示访问信息
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ 启动成功！访问地址:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}📊 前端面板:${NC}  http://${SERVER_IP}:3000"
echo -e "${PURPLE}🚀 API网关:${NC}   http://${SERVER_IP}:8080"
echo -e "${PURPLE}🐍 Python API:${NC} http://${SERVER_IP}:5000"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 核心功能说明
echo -e "\n${GREEN}🎯 核心功能:${NC}"
echo -e "  ${CYAN}✦${NC} 图对抗算法检测 (GNN)"
echo -e "  ${CYAN}✦${NC} 7层纵深防御体系"
echo -e "  ${CYAN}✦${NC} 🌐 VPN流量检测"
echo -e "  ${CYAN}✦${NC} 📱 设备指纹识别"
echo -e "  ${CYAN}✦${NC} 🔓 刷机/Root检测"
echo -e "  ${CYAN}✦${NC} 🤖 模拟器识别"
echo -e "  ${CYAN}✦${NC} 🔄 IP异常检测"

# 查看日志命令
echo -e "\n${YELLOW}📝 查看日志:${NC}"
echo -e "  ${COMPOSE_CMD} logs -f [服务名]"
echo -e "\n${YELLOW}🛑 停止服务:${NC}"
echo -e "  ${COMPOSE_CMD} down"
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"


