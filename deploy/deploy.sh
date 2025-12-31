#!/bin/bash

# ============================================================
# KanBan 周报系统 - 一键部署脚本
# ============================================================

set -e

echo "========================================"
echo "KanBan 周报系统 - 一键部署"
echo "========================================"
echo ""

# 项目根目录
PROJECT_ROOT="/opt/kanban"

# 步骤 1: 环境初始化
echo "步骤 1/4: 环境初始化"
echo "----------------------------------------"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: Node.js 未安装"
    echo "请先安装 Node.js 20+: https://nodejs.org/"
    exit 1
fi

echo "✓ Docker 版本: $(docker --version)"
echo "✓ Node.js 版本: $(node --version)"
echo "✓ npm 版本: $(npm --version)"
echo ""

# 步骤 2: 启动数据库
echo "步骤 2/4: 启动数据库"
echo "----------------------------------------"
cd $PROJECT_ROOT/deploy
docker-compose up -d
echo "等待数据库启动..."
sleep 5
docker-compose exec -T postgres pg_isready -U kanban_user
echo "✓ 数据库已启动"
echo ""

# 步骤 3: 数据初始化
echo "步骤 3/4: 数据初始化"
echo "----------------------------------------"
cd $PROJECT_ROOT/backend

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
fi

# 运行数据库迁移
echo "运行数据库迁移..."
export DATABASE_URL="postgresql://kanban_user:kanban_password@localhost:5432/kanban_db"
npm run migrate:up

# 创建初始数据
echo "创建初始数据..."
npm run seed

echo "✓ 数据库初始化完成"
echo ""

# 步骤 4: 启动后端
echo "步骤 4/4: 启动后端"
echo "----------------------------------------"
cd $PROJECT_ROOT/backend
npm run build
echo "启动后端服务..."
nohup npm start > $PROJECT_ROOT/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > $PROJECT_ROOT/logs/backend.pid
echo "✓ 后端服务已启动 (PID: $BACKEND_PID)"
echo ""

# 步骤 5: 启动前端
echo "步骤 5/5: 启动前端"
echo "----------------------------------------"
cd $PROJECT_ROOT/frontend

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

# 生产模式构建
echo "构建前端..."
npm run build

# 启动前端服务
echo "启动前端服务..."
nohup npm run preview -- --host 0.0.0.0 --port 3003 > $PROJECT_ROOT/logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > $PROJECT_ROOT/logs/frontend.pid
echo "✓ 前端服务已启动 (PID: $FRONTEND_PID)"
echo ""

echo "========================================"
echo "部署完成！"
echo "========================================"
echo ""
echo "访问地址: http://服务器IP:3003"
echo ""
echo "默认账户:"
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "⚠️  请立即登录并修改默认密码！"
echo ""
echo "查看日志:"
echo "  后端: tail -f $PROJECT_ROOT/logs/backend.log"
echo "  前端: tail -f $PROJECT_ROOT/logs/frontend.log"
echo ""
