#!/bin/bash

# 测试Kimi K2 API集成
# 使用前请确保已设置 KIMI_API_KEY 环境变量

echo "=== 测试 Kimi K2 API 集成 ==="
echo

# 加载环境变量
if [ -f backend/.env ]; then
    export $(cat backend/.env | grep -v '^#' | xargs)
fi

# 检查API密钥
if [ -z "$KIMI_API_KEY" ]; then
    echo "错误: 请设置 KIMI_API_KEY 环境变量"
    echo "您可以在 backend/.env 文件中添加: KIMI_API_KEY=your_api_key_here"
    exit 1
fi

# 启动后端服务（如果未运行）
echo "检查后端服务状态..."
if ! curl -s http://localhost:7001/health > /dev/null 2>&1; then
    echo "后端服务未运行，正在启动..."
    cd backend && npm run dev &
    BACKEND_PID=$!
    sleep 5
fi

# 测试获取模型列表
echo "1. 测试获取模型列表"
echo "-------------------"
curl -s http://localhost:7001/api/chat/models | jq '.data.kimi'
echo

# 测试发送消息
echo "2. 测试发送消息到 Kimi K2"
echo "------------------------"
curl -X POST http://localhost:7001/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "kimi",
    "model": "kimi-k2-0711-preview",
    "message": "请简单介绍一下你自己，你是Kimi K2模型。",
    "history": []
  }' | jq '.'

echo

# 如果我们启动了后端服务，关闭它
if [ ! -z "$BACKEND_PID" ]; then
    echo "关闭测试后端服务..."
    kill $BACKEND_PID
fi

echo "测试完成！"