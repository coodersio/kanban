#!/bin/bash

# ============================================================
# KanBan 周报系统 - 停止服务脚本
# ============================================================

PROJECT_ROOT="/opt/kanban"

echo "停止 KanBan 服务..."
echo ""

# 停止前端
if [ -f "$PROJECT_ROOT/logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat $PROJECT_ROOT/logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null; then
        kill $FRONTEND_PID
        echo "✓ 前端服务已停止"
    fi
    rm -f $PROJECT_ROOT/logs/frontend.pid
fi

# 停止后端
if [ -f "$PROJECT_ROOT/logs/backend.pid" ]; then
    BACKEND_PID=$(cat $PROJECT_ROOT/logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null; then
        kill $BACKEND_PID
        echo "✓ 后端服务已停止"
    fi
    rm -f $PROJECT_ROOT/logs/backend.pid
fi

# 停止数据库
cd $PROJECT_ROOT/deploy
docker-compose stop
echo "✓ 数据库已停止"

echo ""
echo "所有服务已停止"
