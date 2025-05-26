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
    const { provider, model, messages, files = [] } = options;
    
    try {
      if (provider === 'openai') {
        return await this.chatWithOpenAI(model, messages, files);
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

  async chatWithOpenAI(model = 'gpt-3.5-turbo', messages, files) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    // 处理文件内容
    const processedMessages = await this.processMessagesWithFiles(messages, files);

    const completion = await this.openai.chat.completions.create({
      model,
      messages: processedMessages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    return {
      success: true,
      data: {
        content: completion.choices[0].message.content,
        usage: completion.usage,
      },
    };
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
    // 如果有文件，将文件内容添加到消息中
    if (files && files.length > 0) {
      const fileContents = await this.readFiles(files);
      const fileContext = fileContents.map(file => 
        `文件名: ${file.filename}\n内容:\n${file.content}`
      ).join('\n\n---\n\n');

      // 将文件内容添加到第一个用户消息前
      const firstUserMsgIndex = messages.findIndex(msg => msg.role === 'user');
      if (firstUserMsgIndex >= 0) {
        messages[firstUserMsgIndex].content = 
          `以下是上传的文件内容:\n\n${fileContext}\n\n---\n\n${messages[firstUserMsgIndex].content}`;
      }
    }

    return messages;
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
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      ],
      claude: [
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
      ],
    };
  }
}

module.exports = AiService; 