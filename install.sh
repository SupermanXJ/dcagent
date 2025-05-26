#!/bin/bash

echo "安装DC智能体项目依赖..."

# 安装主项目依赖
echo "安装主项目依赖..."
npm install concurrently

# 安装后端依赖
echo "安装后端依赖..."
cd backend
npm install

if [ $? -ne 0 ]; then
    echo "后端依赖安装失败，请检查npm配置"
    exit 1
fi

# 安装前端依赖
echo "安装前端依赖..."
cd ../frontend
npm install

if [ $? -ne 0 ]; then
    echo "前端依赖安装失败，请检查npm配置"
    exit 1
fi

echo "所有依赖安装完成！"
echo "运行 ./start.sh 启动项目" 