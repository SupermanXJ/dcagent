#!/bin/bash

echo "启动DC智能体项目..."

# 检查并清理占用的端口
cleanup_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "发现端口 $port 被进程 $pid 占用，正在清理..."
        kill -9 $pid
        sleep 1
        echo "端口 $port 已清理"
    fi
}

# 清理后端端口 7001
cleanup_port 7001

# 清理前端端口 8000
cleanup_port 8000

# 检查依赖是否已安装
if [ ! -d "backend/node_modules" ]; then
    echo "后端依赖未安装，请先运行: cd backend && pnpm install"
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "前端依赖未安装，请先运行: cd frontend && pnpm install"
    exit 1
fi

# 启动后端服务
echo "启动后端服务..."
cd backend
pnpm run dev &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端服务
echo "启动前端服务..."
cd ../frontend
pnpm run dev &
FRONTEND_PID=$!

echo "服务已启动:"
echo "- 后端服务: http://localhost:7001"
echo "- 前端服务: http://localhost:8000"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获中断信号，优雅关闭服务
trap 'echo "正在关闭服务..."; kill $BACKEND_PID $FRONTEND_PID; exit 0' INT

# 等待用户中断
wait $BACKEND_PID $FRONTEND_PID 