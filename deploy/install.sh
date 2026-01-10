#!/bin/bash

###############################################################################
# KanBan 一键部署脚本
# 适用于 Ubuntu/Debian/CentOS/RHEL 系统
###############################################################################

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
    echo ""
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        print_error "无法检测操作系统"
        exit 1
    fi
    print_info "检测到操作系统: $OS $VER"
}

# 检查 Docker 是否已安装
check_docker() {
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
        print_success "Docker 已安装: v$DOCKER_VERSION"
        return 0
    else
        print_info "Docker 未安装"
        return 1
    fi
}

# 安装 Docker
install_docker() {
    print_header "安装 Docker"

    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        print_info "使用 apt 安装 Docker..."
        sudo apt update
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        rm get-docker.sh
    elif [[ "$OS" == "centos" ]] || [[ "$OS" == "rhel" ]]; then
        print_info "使用 yum 安装 Docker..."
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io
    else
        print_error "不支持的操作系统: $OS"
        exit 1
    fi

    # 启动 Docker
    sudo systemctl start docker
    sudo systemctl enable docker

    # 添加用户到 docker 组
    sudo usermod -aG docker $USER

    print_success "Docker 安装完成"
}

# 检查 Docker Compose 是否已安装
check_docker_compose() {
    if docker compose version &> /dev/null; then
        COMPOSE_VERSION=$(docker compose version | cut -d ' ' -f4)
        print_success "Docker Compose 已安装: v$COMPOSE_VERSION"
        return 0
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d ' ' -f4 | cut -d ',' -f1)
        print_success "Docker Compose (v1) 已安装: v$COMPOSE_VERSION"
        return 0
    else
        print_info "Docker Compose 未安装"
        return 1
    fi
}

# 安装 Docker Compose
install_docker_compose() {
    print_header "安装 Docker Compose"

    # 尝试安装插件版本
    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        sudo apt update
        sudo apt install -y docker-compose-plugin || {
            print_info "插件安装失败，尝试安装独立版本..."
            install_docker_compose_standalone
        }
    else
        install_docker_compose_standalone
    fi

    print_success "Docker Compose 安装完成"
}

# 安装 Docker Compose 独立版本
install_docker_compose_standalone() {
    COMPOSE_VERSION="2.24.0"
    sudo curl -L "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
}

# 配置防火墙
configure_firewall() {
    print_header "配置防火墙"

    read -p "请输入要开放的端口 (默认: 5003): " PORT
    PORT=${PORT:-5003}

    if command -v ufw &> /dev/null; then
        print_info "使用 ufw 开放端口 $PORT..."
        sudo ufw allow $PORT/tcp
        print_success "端口 $PORT 已开放 (ufw)"
    elif command -v firewall-cmd &> /dev/null; then
        print_info "使用 firewalld 开放端口 $PORT..."
        sudo firewall-cmd --permanent --add-port=$PORT/tcp
        sudo firewall-cmd --reload
        print_success "端口 $PORT 已开放 (firewalld)"
    else
        print_info "未检测到防火墙管理工具，请手动开放端口 $PORT"
    fi
}

# 生成随机密码
generate_password() {
    openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
}

# 配置环境变量
configure_env() {
    print_header "配置环境变量"

    if [ -f .env ]; then
        print_info "检测到现有 .env 文件"
        read -p "是否覆盖? (y/N): " OVERWRITE
        if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
            print_info "跳过环境变量配置"
            return
        fi
    fi

    print_info "生成随机密码..."
    POSTGRES_PASSWORD=$(generate_password)
    SESSION_SECRET=$(generate_password)

    cat > .env << EOF
# PostgreSQL 数据库密码
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# Session 密钥
SESSION_SECRET=$SESSION_SECRET
EOF

    print_success "环境变量已配置"
    print_info "PostgreSQL 密码: $POSTGRES_PASSWORD"
    print_info "Session 密钥: $SESSION_SECRET"
    echo ""
    print_info "这些密码已保存到 .env 文件，请妥善保管！"
}

# 构建和启动服务
start_services() {
    print_header "构建和启动服务"

    print_info "正在构建 Docker 镜像..."

    # 检查使用哪个 compose 命令
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi

    $COMPOSE_CMD build --no-cache
    print_success "镜像构建完成"

    print_info "启动容器..."
    $COMPOSE_CMD up -d
    print_success "容器已启动"

    print_info "等待服务启动..."
    sleep 15

    # 检查容器状态
    print_info "容器状态:"
    $COMPOSE_CMD ps
}

# 初始化数据库
init_database() {
    print_header "初始化数据库"

    # 检查使用哪个 compose 命令
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi

    print_info "运行数据库迁移..."
    $COMPOSE_CMD exec -T backend npm run migrate:up || {
        print_info "迁移可能已存在，继续..."
    }
    print_success "数据库迁移完成"

    print_info "创建初始数据..."
    $COMPOSE_CMD exec -T backend npm run seed || {
        print_info "初始数据可能已存在，继续..."
    }
    print_success "数据库初始化完成"
}

# 显示部署信息
show_deployment_info() {
    print_header "部署完成！"

    # 获取服务器 IP
    SERVER_IP=$(hostname -I | awk '{print $1}')

    # 从 docker-compose.yml 读取端口
    PORT=$(grep -A 2 "nginx:" docker-compose.yml | grep "ports:" -A 1 | grep -o "[0-9]*:80" | cut -d: -f1)
    PORT=${PORT:-5003}

    echo ""
    print_success "KanBan 已成功部署！"
    echo ""
    echo "访问地址: http://$SERVER_IP:$PORT"
    echo "默认账户: admin"
    echo "默认密码: admin123"
    echo ""
    print_info "⚠️  请登录后立即修改管理员密码！"
    echo ""
    print_info "常用命令:"
    echo "  查看日志: cd deploy && docker compose logs -f"
    echo "  重启服务: cd deploy && docker compose restart"
    echo "  停止服务: cd deploy && docker compose down"
    echo "  更新代码: cd .. && git pull && cd deploy && docker compose up -d --build"
    echo ""
}

# 主函数
main() {
    print_header "KanBan 一键部署脚本"

    # 检查是否在 deploy 目录
    if [ ! -f "docker-compose.yml" ]; then
        print_error "请在 deploy 目录下运行此脚本"
        print_info "cd deploy && ./install.sh"
        exit 1
    fi

    # 检测操作系统
    detect_os

    # 检查并安装 Docker
    if ! check_docker; then
        read -p "是否安装 Docker? (Y/n): " INSTALL_DOCKER
        if [[ ! "$INSTALL_DOCKER" =~ ^[Nn]$ ]]; then
            install_docker
        else
            print_error "Docker 是必需的，退出安装"
            exit 1
        fi
    fi

    # 检查并安装 Docker Compose
    if ! check_docker_compose; then
        read -p "是否安装 Docker Compose? (Y/n): " INSTALL_COMPOSE
        if [[ ! "$INSTALL_COMPOSE" =~ ^[Nn]$ ]]; then
            install_docker_compose
        else
            print_error "Docker Compose 是必需的，退出安装"
            exit 1
        fi
    fi

    # 配置防火墙
    read -p "是否配置防火墙? (Y/n): " CONFIGURE_FW
    if [[ ! "$CONFIGURE_FW" =~ ^[Nn]$ ]]; then
        configure_firewall
    fi

    # 配置环境变量
    configure_env

    # 构建和启动服务
    start_services

    # 初始化数据库
    init_database

    # 显示部署信息
    show_deployment_info

    print_info "如果遇到权限问题，请注销并重新登录，或运行: newgrp docker"
}

# 运行主函数
main
