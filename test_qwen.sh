#!/bin/bash

echo "🚀 测试通义千问集成功能..."

# 检查服务是否运行
if ! curl -s http://127.0.0.1:7001/health > /dev/null 2>&1; then
    echo "❌ 后端服务未运行，请先启动服务：cd backend && npm run dev"
    exit 1
fi

echo "✅ 后端服务运行正常"

# 测试模型列表
echo -e "\n📋 测试模型列表API..."
MODELS_RESPONSE=$(curl -s http://127.0.0.1:7001/api/chat/models)
QWEN_MODELS=$(echo $MODELS_RESPONSE | jq -r '.data.qwen | length')

if [ "$QWEN_MODELS" -eq 10 ]; then
    echo "✅ 通义千问模型列表正常 (共10个模型)"
    echo $MODELS_RESPONSE | jq -r '.data.qwen[].label' | head -5
    echo "..."
else
    echo "❌ 通义千问模型列表异常"
    exit 1
fi

# 测试聊天功能
echo -e "\n💬 测试聊天功能..."
CHAT_RESPONSE=$(curl -s -X POST "http://127.0.0.1:7001/api/chat/send" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "qwen",
    "model": "qwen-turbo",
    "message": "你好，这是一个测试消息",
    "history": "[]"
  }')

if echo $CHAT_RESPONSE | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ 聊天功能正常"
    echo "📤 发送: 你好，这是一个测试消息"
    echo "📥 回复: $(echo $CHAT_RESPONSE | jq -r '.data.content' | cut -c1-100)..."
    echo "📊 使用情况: $(echo $CHAT_RESPONSE | jq -r '.data.usage.total_tokens') tokens"
else
    echo "❌ 聊天功能异常"
    echo "错误信息: $(echo $CHAT_RESPONSE | jq -r '.error // "未知错误"')"
    exit 1
fi

echo -e "\n🎉 通义千问集成测试完成！所有功能正常！"
echo "ℹ️  提示：确保在.env文件中配置了有效的DASHSCOPE_API_KEY" 