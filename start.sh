#!/bin/bash

echo "启动DC智能体项目..."

# 检查依赖是否已安装
if [ ! -d "backend/node_modules" ]; then
    echo "后端依赖未安装，请先运行: cd backend && npm install"
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "前端依赖未安装，请先运行: cd frontend && npm install"
    exit 1
fi

# 启动后端服务
echo "启动后端服务..."
cd backend
npm run dev &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端服务
echo "启动前端服务..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "服务已启动:"
echo "- 后端服务: http://localhost:7001"
echo "- 前端服务: http://localhost:8000"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
wait $BACKEND_PID $FRONTEND_PID 