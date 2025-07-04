#!/bin/bash

echo "停止DC智能体项目服务..."

# 停止占用端口的进程
stop_port() {
    local port=$1
    local service_name=$2
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "正在停止 $service_name (端口 $port, 进程 $pid)..."
        kill -9 $pid
        sleep 1
        echo "$service_name 已停止"
    else
        echo "$service_name 未运行"
    fi
}

# 停止后端服务 (端口 7001)
stop_port 7001 "后端服务"

# 停止前端服务 (端口 8000)
stop_port 8000 "前端服务"

# 停止egg后端服务(如果使用egg-scripts启动)
cd backend
pnpm run stop 2>/dev/null || echo "egg后端服务未使用daemon模式运行"

echo "所有服务已停止" 