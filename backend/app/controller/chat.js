'use strict';

const { Controller } = require('egg');

class ChatController extends Controller {
  async send() {
    const { ctx } = this;

    try {
      // 验证请求参数
      // ctx.validate({
      //   provider: { type: 'string', required: true },
      //   model: { type: 'string', required: true },
      //   message: { type: 'string', required: true },
      //   history: { type: 'array', required: false },
      // });
      const { provider, model, message, history = '[]', previous_response_id, stream: streamParam = 'false', deepThinking: deepThinkingParam = 'false' } = ctx.request.body;
      // 正确解析stream参数（FormData中都是字符串）
      const stream = streamParam === 'true' || streamParam === true;
      // 正确解析deepThinking参数（FormData中都是字符串）
      const deepThinking = deepThinkingParam === 'true' || deepThinkingParam === true;
      const files = ctx.request.files || [];

      // 解析history JSON字符串
      let parsedHistory = [];
      try {
        parsedHistory = typeof history === 'string' ? JSON.parse(history) : history;
      } catch (error) {
        ctx.logger.error('Error parsing history JSON:', error);
        parsedHistory = [];
      }

      // 构建消息历史
      const messages = [
        ...parsedHistory,
        { role: 'user', content: message },
      ];

      // 调用AI服务
      const result = await ctx.service.ai.chat({
        provider,
        model,
        messages,
        files,
        previous_response_id, // 传递previous_response_id
        stream,
        deepThinking, // 传递深度思考参数
      });

      if (stream && result.stream) {
        // 处理流式响应
        ctx.type = 'text/event-stream';
        ctx.set('Cache-Control', 'no-cache');
        ctx.set('Connection', 'keep-alive');
        ctx.set('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲

        // 根据不同的provider处理流
        if (provider === 'openai' || provider === 'qwen' || provider === 'doubao' || provider === 'kimi' || provider === 'deepseek') {
          // OpenAI兼容的流格式
          for await (const chunk of result.stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            if (delta) {
              ctx.res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
            }
            // 检查是否有usage信息（通常在最后一个chunk）
            if (chunk.usage) {
              ctx.res.write(`data: ${JSON.stringify({ usage: chunk.usage, done: true })}\n\n`);
            }
          }
        } else if (provider === 'claude') {
          // Claude的流格式
          for await (const event of result.stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta?.text || '';
              if (delta) {
                ctx.res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
              }
            } else if (event.type === 'message_stop') {
              // Claude在message_stop事件中包含usage信息
              const usage = event.message?.usage;
              if (usage) {
                ctx.res.write(`data: ${JSON.stringify({ usage, done: true })}\n\n`);
              } else {
                ctx.res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
              }
            }
          }
        } else if (provider === 'gemini') {
          // Gemini的流格式
          let finalUsage = null;
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              ctx.res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
            }
            // 尝试获取usage信息（可能在流的结尾）
            const response = await chunk.response;
            if (response && response.usageMetadata) {
              finalUsage = {
                prompt_tokens: response.usageMetadata.promptTokenCount || 0,
                completion_tokens: response.usageMetadata.candidatesTokenCount || 0,
                total_tokens: response.usageMetadata.totalTokenCount || 0,
              };
            }
          }
          // 在结束时发送usage信息
          if (finalUsage) {
            ctx.res.write(`data: ${JSON.stringify({ usage: finalUsage, done: true })}\n\n`);
          } else {
            ctx.res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          }
        } else if (provider === 'zhipu') {
          // 智谱AI的流格式
          for await (const chunk of result.stream) {
            if (chunk.choices && chunk.choices[0]) {
              const delta = chunk.choices[0].delta?.content || '';
              if (delta) {
                ctx.res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
              }
            }
            if (chunk.usage) {
              ctx.res.write(`data: ${JSON.stringify({ usage: chunk.usage, done: true })}\n\n`);
            }
          }
        }

        // 发送结束信号
        ctx.res.write('data: [DONE]\n\n');
        ctx.res.end();
      } else {
        // 非流式响应
        ctx.body = result;
      }
    } catch (error) {
      ctx.logger.error('Chat error:', error);
      ctx.body = {
        success: false,
        error: error.message,
      };
      ctx.status = 500;
    }
  }

  async models() {
    const { ctx } = this;
    try {
      const models = ctx.service.ai.getAvailableModels();
      ctx.body = {
        success: true,
        data: models,
      };
    } catch (error) {
      ctx.logger.error('Get models error:', error);
      ctx.body = {
        success: false,
        error: error.message,
      };
      ctx.status = 500;
    }
  }

  async upload() {
    const { ctx } = this;
    try {
      const files = ctx.request.files || [];
      if (!files || files.length === 0) {
        ctx.body = {
          success: false,
          error: 'No files uploaded',
        };
        ctx.status = 400;
        return;
      }

      const uploadedFiles = files.map(file => ({
        filename: file.filename,
        filepath: file.filepath,
        size: file.size,
      }));

      ctx.body = {
        success: true,
        data: uploadedFiles,
      };
    } catch (error) {
      ctx.logger.error('Upload error:', error);
      ctx.body = {
        success: false,
        error: error.message,
      };
      ctx.status = 500;
    }
  }
}

module.exports = ChatController;
