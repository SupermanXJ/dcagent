'use strict';

const { Service } = require('egg');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class AiService extends Service {
  constructor(ctx) {
    super(ctx);
    
    // 初始化OpenAI客户端
    if (this.config.ai.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.config.ai.openai.apiKey,
        baseURL: this.config.ai.openai.baseURL,
      });
    }
    
    // 初始化Claude客户端
    if (this.config.ai.claude.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: this.config.ai.claude.apiKey,
      });
    }
  }

  async chat(options) {
    const { provider, model, messages, files = [], previous_response_id } = options;
    
    try {
      if (provider === 'openai') {
        return await this.chatWithOpenAI(model, messages, files, previous_response_id);
      } else if (provider === 'claude') {
        return await this.chatWithClaude(model, messages, files);
      } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (error) {
      this.logger.error('AI chat error:', error);
      throw error;
    }
  }

  async chatWithOpenAI(model = 'gpt-3.5-turbo', messages, files, previous_response_id) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    // 处理文件内容
    const processedMessages = await this.processMessagesWithFiles(messages, files);

    try {
      // 优先使用Responses API来支持会话状态管理
      try {
        this.logger.info(`Attempting to use Responses API${previous_response_id ? ` with previous_response_id: ${previous_response_id}` : ''}`);
        
        // 获取最后一条用户消息作为输入
        const lastUserMessage = processedMessages.slice().reverse().find(msg => msg.role === 'user');
        const input = lastUserMessage ? lastUserMessage.content : '';

        const requestParams = {
          model,
          input,
          temperature: 0.7,
        };

        // 如果有previous_response_id，添加到请求中
        if (previous_response_id) {
          requestParams.previous_response_id = previous_response_id;
        }

        const response = await this.openai.responses.create(requestParams);

        return {
          success: true,
          data: {
            content: response.output_text || response.output[0]?.content[0]?.text || '',
            usage: response.usage,
            response_id: response.id,
          },
        };
      } catch (responsesError) {
        // 如果Responses API不可用，回退到Chat Completions API
        this.logger.warn('Responses API failed, falling back to Chat Completions API:', responsesError.message);
        
        // 验证处理后的消息格式（用于Chat Completions API）
        for (let i = 0; i < processedMessages.length; i++) {
          const msg = processedMessages[i];
          if (!msg || typeof msg !== 'object' || !msg.role || !msg.content) {
            this.logger.error(`Invalid message format at index ${i}:`, msg);
            throw new Error(`Invalid message format at index ${i}: expected object with 'role' and 'content' properties`);
          }
        }

        // 使用传统的Chat Completions API
        const completion = await this.openai.chat.completions.create({
          model,
          messages: processedMessages,
          temperature: 0.7,
          // max_tokens: 2000,
        });

        return {
          success: true,
          data: {
            content: completion.choices[0].message.content,
            usage: completion.usage,
            response_id: completion.id, // 使用completion ID作为response_id
          },
        };
      }
    } catch (error) {
      // 如果所有尝试都失败，抛出最后的错误
      this.logger.error('All API attempts failed:', error);
      throw error;
    }
  }

  async chatWithClaude(model = 'claude-3-sonnet-20240229', messages, files) {
    if (!this.anthropic) {
      throw new Error('Claude API key not configured');
    }

    // 处理文件内容
    const processedMessages = await this.processMessagesWithFiles(messages, files);
    
    // Claude API格式转换
    const systemMessage = processedMessages.find(msg => msg.role === 'system');
    const userMessages = processedMessages.filter(msg => msg.role !== 'system');

    const message = await this.anthropic.messages.create({
      model,
      max_tokens: 2000,
      system: systemMessage ? systemMessage.content : undefined,
      messages: userMessages,
    });

    return {
      success: true,
      data: {
        content: message.content[0].text,
        usage: message.usage,
      },
    };
  }

  async processMessagesWithFiles(messages, files) {
    // 验证和格式化消息
    const validatedMessages = messages.map(msg => {
      // 如果消息是字符串，转换为正确的格式
      if (typeof msg === 'string') {
        return { role: 'user', content: msg };
      }
      
      // 如果消息是对象但缺少必要字段，补充默认值
      if (typeof msg === 'object' && msg !== null) {
        return {
          role: msg.role || 'user',
          content: msg.content || msg.message || String(msg)
        };
      }
      
      // 其他情况转换为字符串
      return { role: 'user', content: String(msg) };
    });

    // 如果有文件，将文件内容添加到消息中
    if (files && files.length > 0) {
      const fileContents = await this.readFiles(files);
      const fileContext = fileContents.map(file => 
        `文件名: ${file.filename}\n内容:\n${file.content}`
      ).join('\n\n---\n\n');

      // 将文件内容添加到第一个用户消息前
      const firstUserMsgIndex = validatedMessages.findIndex(msg => msg.role === 'user');
      if (firstUserMsgIndex >= 0) {
        validatedMessages[firstUserMsgIndex].content = 
          `以下是上传的文件内容:\n\n${fileContext}\n\n---\n\n${validatedMessages[firstUserMsgIndex].content}`;
      }
    }

    return validatedMessages;
  }

  async readFiles(files) {
    const fs = require('fs').promises;
    const results = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file.filepath, 'utf-8');
        results.push({
          filename: file.filename,
          content,
        });
      } catch (error) {
        this.logger.error(`Error reading file ${file.filename}:`, error);
        results.push({
          filename: file.filename,
          content: `[Error reading file: ${error.message}]`,
        });
      }
    }

    return results;
  }

  getAvailableModels() {
    return {
      openai: [
        { value: 'gpt-4.1', label: 'GPT-4.1 (最新)' },
        { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (最快)' },
        { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
        { value: 'o4-mini', label: 'o4-mini (推理模型)' },
        { value: 'o3', label: 'o3 (推理模型)' },
        { value: 'o3-mini', label: 'o3-mini (推理模型)' },
        { value: 'o1', label: 'o1 (推理模型)' },
        { value: 'gpt-4o', label: 'GPT-4o (2024-11-20)' },
        { value: 'gpt-4o-2024-08-06', label: 'GPT-4o (2024-08-06)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      ],
      claude: [
        { value: 'claude-opus-4-20250514', label: 'Claude Opus 4 (最新最强)' },
        { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (高性能)' },
        { value: 'claude-3-7-sonnet-20250219', label: 'Claude Sonnet 3.7 (扩展思维)' },
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude Sonnet 3.5 v2' },
        { value: 'claude-3-5-sonnet-20240620', label: 'Claude Sonnet 3.5' },
        { value: 'claude-3-5-haiku-20241022', label: 'Claude Haiku 3.5 (最快)' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
        { value: 'claude-opus-4-0', label: 'Claude Opus 4 (别名)' },
      ],
    };
  }
}

module.exports = AiService; 