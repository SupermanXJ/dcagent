'use strict';

const { Controller } = require('egg');

class ChatController extends Controller {
  async send() {
    const { ctx } = this;
    
    try {
      // 验证请求参数
      ctx.validate({
        provider: { type: 'string', required: true },
        model: { type: 'string', required: true },
        message: { type: 'string', required: true },
        history: { type: 'array', required: false },
      });

      const { provider, model, message, history = [] } = ctx.request.body;
      const files = ctx.request.files || [];

      // 构建消息历史
      const messages = [
        ...history,
        { role: 'user', content: message }
      ];

      // 调用AI服务
      const result = await ctx.service.ai.chat({
        provider,
        model,
        messages,
        files,
      });

      ctx.body = result;
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