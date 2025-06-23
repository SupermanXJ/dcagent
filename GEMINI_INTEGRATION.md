# Gemini AI 模型集成指南

## 概述

本项目已成功集成Google Gemini AI的最新10个模型，支持多模态对话功能。

## 支持的Gemini模型

### 最新模型列表（按性能排序）

1. **Gemini 2.5 Pro** - 最新最强的推理模型
2. **Gemini 2.5 Flash** - 最快性价比模型  
3. **Gemini 2.5 Flash-Lite** - 轻量预览版
4. **Gemini 2.0 Flash** - 稳定版本
5. **Gemini 2.0 Flash-Lite** - 轻量稳定版
6. **Gemini 1.5 Pro (002)** - 改进版Pro模型
7. **Gemini 1.5 Flash (002)** - 改进版Flash模型
8. **Gemini 1.5 Flash-8B** - 小型高效模型
9. **Gemini 1.5 Pro (001)** - 经典Pro版本
10. **Gemini 1.5 Flash (001)** - 经典Flash版本

## 配置步骤

### 1. 获取API密钥

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登录Google账户
3. 创建新的API密钥
4. 复制生成的API密钥

### 2. 配置环境变量

在后端项目根目录创建 `.env` 文件（基于 `env.example`）：

```bash
# AI模型配置
OPENAI_API_KEY=your_openai_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here  # 添加你的Gemini API密钥

# 服务配置
PORT=7001
NODE_ENV=development
```

### 3. 安装依赖

```bash
cd backend
npm install
```

新增的依赖包：
- `@google/generative-ai`: Google Generative AI SDK

## 使用方法

### 前端操作

1. 启动前端和后端服务
2. 在聊天界面顶部选择 "AI提供商" 为 **Gemini**
3. 选择想要使用的Gemini模型
4. 开始对话

### API调用示例

```javascript
// 发送聊天请求
const response = await fetch('/api/chat/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    message: '你好，请介绍一下你自己',
    history: []
  })
});
```

## 模型特点

### Gemini 2.5 Pro
- **优势**: 最强推理能力，支持长文本处理
- **适用场景**: 复杂问题解答、代码分析、学术研究
- **上下文窗口**: 1M tokens

### Gemini 2.5 Flash  
- **优势**: 速度快，性价比高
- **适用场景**: 日常对话、快速问答、实时应用
- **上下文窗口**: 1M tokens

### Gemini 1.5 Flash-8B
- **优势**: 模型小，响应快，成本低
- **适用场景**: 简单任务、高频调用、资源受限环境
- **上下文窗口**: 1M tokens

## 功能特性

### 多模态支持
- ✅ 文本对话
- ✅ 图片理解（通过文件上传）
- ✅ 文档分析
- ✅ 代码生成与解释

### 技术特性
- ✅ 长文本上下文（最大1M tokens）
- ✅ 流式响应
- ✅ 会话状态管理
- ✅ 错误处理与重试
- ✅ 使用量统计

## 故障排除

### 常见问题

1. **API密钥无效**
   - 检查 `.env` 文件中的 `GEMINI_API_KEY` 是否正确
   - 确认API密钥在Google AI Studio中有效

2. **模型无法访问**
   - 某些模型可能有地区限制
   - 尝试使用其他可用的Gemini模型

3. **响应速度慢**
   - Gemini 2.5模型处理复杂任务时可能较慢
   - 建议使用Flash系列模型以获得更快响应

### 错误码说明

- `400`: 请求参数错误
- `401`: API密钥无效
- `429`: 请求频率超限
- `500`: 服务器内部错误

## 性能优化建议

1. **模型选择**：根据任务复杂度选择合适的模型
2. **上下文管理**：避免发送过长的历史消息
3. **并发控制**：合理控制并发请求数量
4. **缓存策略**：对于重复性问题可以实现结果缓存

## 更新日志

- **2025-01-XX**: 首次集成Gemini AI支持
- 支持10个最新Gemini模型
- 实现多模态对话功能
- 添加完整的前后端支持

## 相关链接

- [Google Gemini API 文档](https://ai.google.dev/gemini-api/docs)
- [Google AI Studio](https://makersuite.google.com/)
- [Gemini 模型对比](https://ai.google.dev/gemini-api/docs/models/gemini)

---

如有问题或建议，请创建Issue或联系开发团队。 