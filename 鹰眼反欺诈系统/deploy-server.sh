#!/bin/bash
#################################################################
# 🦅 鹰眼反欺诈系统 - 云服务器一键部署脚本
# FraudHawk Server Deployment Script
#################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${CYAN}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"
}

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "请使用 root 用户运行此脚本"
        print_info "使用命令: sudo bash $0"
        exit 1
    fi
}

# 检查Docker是否安装
check_docker() {
    print_header "检查 Docker 环境"
    
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker 已安装: $DOCKER_VERSION"
        return 0
    else
        print_warning "Docker 未安装"
        return 1
    fi
}

# 检查Docker Compose是否安装
check_docker_compose() {
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
        COMPOSE_VERSION=$(docker compose version | head -n 1)
        print_success "Docker Compose 已安装: $COMPOSE_VERSION"
        return 0
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        COMPOSE_VERSION=$(docker-compose --version)
        print_success "Docker Compose 已安装: $COMPOSE_VERSION"
        return 0
    else
        print_warning "Docker Compose 未安装"
        return 1
    fi
}

# 安装Docker
install_docker() {
    print_header "安装 Docker"
    
    print_info "开始安装 Docker..."
    curl -fsSL https://get.docker.com | bash
    
    print_info "启动 Docker 服务..."
    systemctl start docker
    systemctl enable docker
    
    print_success "Docker 安装完成"
}

# 安装Docker Compose
install_docker_compose() {
    print_header "安装 Docker Compose"
    
    print_info "开始安装 Docker Compose Plugin..."
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y docker-compose-plugin
        COMPOSE_CMD="docker compose"
        print_success "Docker Compose Plugin 安装完成"
    elif command -v yum &> /dev/null; then
        yum install -y docker-compose-plugin
        COMPOSE_CMD="docker compose"
        print_success "Docker Compose Plugin 安装完成"
    else
        print_warning "未检测到常见包管理器，将尝试安装独立版"
        curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" \
            -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        COMPOSE_CMD="docker-compose"
        print_success "Docker Compose (独立版) 安装完成"
    fi
}

# 配置防火墙
configure_firewall() {
    print_header "配置防火墙"
    
    if command -v ufw &> /dev/null; then
        print_info "开放必要端口..."
        ufw allow 3000/tcp comment 'FraudHawk Frontend'
        ufw allow 8080/tcp comment 'FraudHawk API Gateway'
        ufw allow 9090/tcp comment 'Prometheus'
        ufw allow 3001/tcp comment 'Grafana'
        print_success "防火墙配置完成"
    else
        print_warning "UFW 未安装，跳过防火墙配置"
    fi
}

# 停止旧服务
stop_old_services() {
    print_header "停止旧服务"
    
    if [ -f "docker-compose.yml" ]; then
        print_info "停止现有容器..."
        $COMPOSE_CMD down 2>/dev/null || true
        print_success "旧服务已停止"
    else
        print_warning "未找到 docker-compose.yml，跳过"
    fi
}

# 启动服务
start_services() {
    print_header "启动鹰眼反欺诈系统"
    
    if [ ! -f "docker-compose.yml" ]; then
        print_error "未找到 docker-compose.yml 文件"
        print_info "请确保在项目根目录执行此脚本"
        exit 1
    fi
    
    print_info "检查必要文件..."
    if [ ! -d "docker" ]; then
        print_error "docker 目录不存在"
        exit 1
    fi
    
    if [ ! -f "docker/Dockerfile.python" ]; then
        print_error "缺少 Dockerfile.python"
        exit 1
    fi
    
    print_success "配置文件检查通过"
    
    print_info "构建并启动服务（这可能需要几分钟）..."
    $COMPOSE_CMD -f docker-compose.yml up -d --build
    
    print_success "服务启动完成"
}

# 显示服务状态
show_status() {
    print_header "服务状态"
    
    sleep 5
    
    echo ""
    $COMPOSE_CMD ps
    echo ""
    
    print_info "检查服务健康状态..."
    sleep 5
    
    # 获取服务器IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="localhost"
    fi
    
    print_header "部署完成"
    
    echo -e "${GREEN}"
    echo "🦅 鹰眼反欺诈系统已成功部署！"
    echo ""
    echo "📍 访问地址:"
    echo "   🎨 前端监控面板:  http://${SERVER_IP}:3000"
    echo "   ⚡ API网关:       http://${SERVER_IP}:8080"
    echo "   📊 Prometheus:    http://${SERVER_IP}:9090"
    echo "   📈 Grafana:       http://${SERVER_IP}:3001"
    echo "      └─ 账号: admin / admin"
    echo ""
    echo "📝 常用命令:"
    echo "   查看日志:    $COMPOSE_CMD logs -f"
    echo "   停止服务:    $COMPOSE_CMD down"
    echo "   重启服务:    $COMPOSE_CMD restart"
    echo "   查看状态:    $COMPOSE_CMD ps"
    echo ""
    echo "🔍 故障排查:"
    echo "   查看全部日志: docker-compose logs"
    echo "   进入容器:     docker exec -it fraud-go-gateway sh"
    echo -e "${NC}"
}

# 显示日志选项
show_logs_option() {
    echo ""
    read -p "是否查看实时日志？(y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "按 Ctrl+C 退出日志查看"
        sleep 2
        $COMPOSE_CMD logs -f
    fi
}

#################################################################
# 主程序
#################################################################

main() {
    clear
    
    echo -e "${PURPLE}"
    cat << "EOF"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║           🦅 鹰眼反欺诈系统 - FraudHawk                   ║
║              云服务器一键部署脚本                          ║
║                                                            ║
║         Sharp Eyes, Secure Future                          ║
║         鹰眼识风险，智能护安全                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    # 检查root权限
    check_root
    
    # 检查并安装Docker
    if ! check_docker; then
        install_docker
    fi
    
    # 检查并安装Docker Compose
    if ! check_docker_compose; then
        install_docker_compose
    fi
    
    # 配置防火墙
    configure_firewall
    
    # 停止旧服务
    stop_old_services
    
    # 启动服务
    start_services
    
    # 显示状态
    show_status
    
    # 询问是否查看日志
    show_logs_option
}

# 执行主程序
main "$@"

