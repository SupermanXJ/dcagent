'use strict';

const { Service } = require('egg');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ZhipuAI } = require('zhipuai-sdk-nodejs-v4');

class AiService extends Service {

  // 初始化OpenAI客户端
  getOpenAIClient() {
    if (!this.config.ai.openai.apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    return new OpenAI({
      apiKey: this.config.ai.openai.apiKey,
      baseURL: this.config.ai.openai.baseURL,
    });
  }

  // 初始化Claude客户端
  getClaudeClient() {
    if (!this.config.ai.claude.apiKey) {
      throw new Error('Claude API key not configured');
    }
    return new Anthropic({
      apiKey: this.config.ai.claude.apiKey,
    });
  }

  // 初始化Gemini客户端
  getGeminiClient() {
    if (!this.config.ai.gemini.apiKey) {
      throw new Error('Gemini API key not configured');
    }
    return new GoogleGenerativeAI(this.config.ai.gemini.apiKey);
  }

  // 初始化智谱AI客户端
  getZhipuClient() {
    if (!this.config.ai.zhipu.apiKey) {
      throw new Error('智谱AI API key not configured');
    }
    return new ZhipuAI({
      apiKey: this.config.ai.zhipu.apiKey,
    });
  }

  // 初始化通义千问客户端 - 使用OpenAI兼容模式
  getQwenClient() {
    if (!this.config.ai.qwen.apiKey) {
      throw new Error('通义千问 API key not configured');
    }
    return new OpenAI({
      apiKey: this.config.ai.qwen.apiKey,
      baseURL: this.config.ai.qwen.baseURL,
    });
  }

  // 初始化豆包客户端 - 使用OpenAI兼容模式
  getDoubaoClient() {
    if (!this.config.ai.doubao.apiKey) {
      throw new Error('豆包 API key not configured');
    }
    return new OpenAI({
      apiKey: this.config.ai.doubao.apiKey,
      baseURL: this.config.ai.doubao.baseURL,
    });
  }

  // 初始化Kimi客户端 - 使用OpenAI兼容模式
  getKimiClient() {
    if (!this.config.ai.kimi.apiKey) {
      throw new Error('Kimi API key not configured');
    }
    return new OpenAI({
      apiKey: this.config.ai.kimi.apiKey,
      baseURL: this.config.ai.kimi.baseURL,
    });
  }

  async chat(options) {
    const { provider, model, messages, files = [], previous_response_id } = options;

    try {
      if (provider === 'openai') {
        return await this.chatWithOpenAI(model, messages, files, previous_response_id);
      }
      if (provider === 'claude') {
        return await this.chatWithClaude(model, messages, files);
      }
      if (provider === 'gemini') {
        return await this.chatWithGemini(model, messages, files);
      }
      if (provider === 'zhipu') {
        return await this.chatWithZhipu(model, messages, files);
      }
      if (provider === 'qwen') {
        return await this.chatWithQwen(model, messages, files);
      }
      if (provider === 'doubao') {
        return await this.chatWithDoubao(model, messages, files);
      }
      if (provider === 'kimi') {
        return await this.chatWithKimi(model, messages, files);
      }
      throw new Error(`Unsupported AI provider: ${provider}`);
    } catch (error) {
      this.logger.error('AI chat error:', error);
      throw error;
    }
  }

  async chatWithOpenAI(model = 'gpt-3.5-turbo', messages, files, previous_response_id) {
    // 初始化OpenAI客户端
    const openai = this.getOpenAIClient();

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

        const response = await openai.responses.create(requestParams);

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
        const completion = await openai.chat.completions.create({
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
    // 初始化Claude客户端
    const anthropic = this.getClaudeClient();

    // 处理文件内容
    const processedMessages = await this.processMessagesWithFiles(messages, files);

    // Claude API格式转换
    const systemMessage = processedMessages.find(msg => msg.role === 'system');
    const userMessages = processedMessages.filter(msg => msg.role !== 'system');

    const message = await anthropic.messages.create({
      model,
      // max_tokens: 2000,
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

  async chatWithGemini(model = 'gemini-2.5-pro', messages, files) {
    // 初始化Gemini客户端
    const genAI = this.getGeminiClient();

    try {
      // 获取模型实例
      const geminiModel = genAI.getGenerativeModel({ model });

      // 处理文件内容
      const processedMessages = await this.processMessagesWithFiles(messages, files);

      // 将消息格式转换为Gemini格式
      const geminiMessages = this.convertMessagesToGeminiFormat(processedMessages);

      // 开始聊天会话
      const chat = geminiModel.startChat({
        history: geminiMessages.history,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 8192,
        },
      });

      // 发送消息
      const result = await chat.sendMessage(geminiMessages.prompt);
      const response = await result.response;

      return {
        success: true,
        data: {
          content: response.text(),
          usage: {
            prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
            completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: response.usageMetadata?.totalTokenCount || 0,
          },
          response_id: result.response.candidates[0]?.index || 'gemini-response',
        },
      };
    } catch (error) {
      this.logger.error('Gemini chat error:', error);
      throw error;
    }
  }

  async chatWithZhipu(model = 'glm-4', messages, files) {
    // 初始化智谱AI客户端
    const zhipuAI = this.getZhipuClient();

    try {
      // 处理文件内容
      const processedMessages = await this.processMessagesWithFiles(messages, files);

      // 智谱AI使用 createCompletions 方法
      const response = await zhipuAI.createCompletions({
        model,
        messages: processedMessages,
        temperature: 0.7,
        stream: false,
      });

      return {
        success: true,
        data: {
          content: response.choices[0].message.content,
          usage: response.usage,
          response_id: response.id,
        },
      };
    } catch (error) {
      this.logger.error('智谱AI chat error:', error);
      throw error;
    }
  }

  async chatWithQwen(model = 'qwen-max', messages, files) {
    // 初始化通义千问客户端
    const qwenOpenAI = this.getQwenClient();

    try {
      // 处理文件内容
      const processedMessages = await this.processMessagesWithFiles(messages, files);

      // 使用OpenAI兼容模式调用通义千问
      const completion = await qwenOpenAI.chat.completions.create({
        model,
        messages: processedMessages,
        temperature: 0.7,
        stream: false,
      });

      return {
        success: true,
        data: {
          content: completion.choices[0].message.content,
          usage: completion.usage,
          response_id: completion.id,
        },
      };
    } catch (error) {
      this.logger.error('通义千问 chat error:', error);
      throw error;
    }
  }

  async chatWithDoubao(model = 'doubao-pro-32k', messages, files) {
    // 初始化豆包客户端
    const doubaoOpenAI = this.getDoubaoClient();

    try {
      // 处理文件内容
      const processedMessages = await this.processMessagesWithFiles(messages, files);

      // 使用OpenAI兼容模式调用豆包
      const completion = await doubaoOpenAI.chat.completions.create({
        model,
        messages: processedMessages,
        temperature: 0.7,
        stream: false,
        max_tokens: 16384,
      });

      return {
        success: true,
        data: {
          content: completion.choices[0].message.content,
          usage: completion.usage,
          response_id: completion.id,
        },
      };
    } catch (error) {
      this.logger.error('豆包 chat error:', error);
      throw error;
    }
  }

  async chatWithKimi(model = 'kimi-k2-0711-preview', messages, files) {
    // 初始化Kimi客户端
    const kimiOpenAI = this.getKimiClient();

    try {
      // 处理文件内容
      const processedMessages = await this.processMessagesWithFiles(messages, files);

      // 根据文档推荐，Kimi K2 的温度应该是 0.6
      const temperature = 0.2;

      // 使用OpenAI兼容模式调用Kimi
      const completion = await kimiOpenAI.chat.completions.create({
        model,
        messages: processedMessages,
        temperature,
        stream: false,
        max_tokens: 128000,
      });

      return {
        success: true,
        data: {
          content: completion.choices[0].message.content,
          usage: completion.usage,
          response_id: completion.id,
        },
      };
    } catch (error) {
      this.logger.error('Kimi chat error:', error);
      throw error;
    }
  }

  convertMessagesToGeminiFormat(messages) {
    const history = [];
    let prompt = '';

    for (const message of messages) {
      if (message.role === 'system') {
        // 系统消息可以添加到第一个用户消息中
        continue;
      } else if (message.role === 'user') {
        history.push({
          role: 'user',
          parts: [{ text: message.content }],
        });
      } else if (message.role === 'assistant') {
        history.push({
          role: 'model',
          parts: [{ text: message.content }],
        });
      }
    }

    // 获取最后一个用户消息作为当前prompt
    if (history.length > 0 && history[history.length - 1].role === 'user') {
      prompt = history.pop().parts[0].text;
    }

    return { history, prompt };
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
          content: msg.content || msg.message || String(msg),
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

  filterRulesByItems(rulesData, itemsArray) {
    // 验证参数
    if (!rulesData || typeof rulesData !== 'object' || !itemsArray || !Array.isArray(itemsArray)) {
      throw new Error('Invalid parameters: rulesData must be an object and itemsArray must be an array');
    }

    // 创建结果对象，保留除properties和allOf外的所有顶层属性
    const filteredResult = {};
    
    // 复制所有非properties和allOf的属性
    Object.keys(rulesData).forEach(key => {
      if (key !== 'properties' && key !== 'allOf') {
        filteredResult[key] = rulesData[key];
      }
    });

    // 筛选properties
    if (rulesData.properties && typeof rulesData.properties === 'object') {
      const filteredProperties = {};
      
      // 遍历rulesData的properties
      Object.keys(rulesData.properties).forEach(propertyKey => {
        // 如果itemsArray中包含这个属性名，则保留它
        if (itemsArray.includes(propertyKey)) {
          filteredProperties[propertyKey] = rulesData.properties[propertyKey];
        }
      });
      
      // 只有在有筛选结果时才添加properties
      if (Object.keys(filteredProperties).length > 0) {
        filteredResult.properties = filteredProperties;
      }
    }

    // 筛选allOf
    if (rulesData.allOf && Array.isArray(rulesData.allOf)) {
      const filteredAllOf = [];
      
      // 递归处理allOf中的每个条件
      rulesData.allOf.forEach(condition => {
        const filteredCondition = this.filterAllOfCondition(condition, itemsArray);
        if (filteredCondition && this.hasRelevantContent(filteredCondition)) {
          filteredAllOf.push(filteredCondition);
        }
      });
      
      // 只有在有筛选结果时才添加allOf
      if (filteredAllOf.length > 0) {
        filteredResult.allOf = filteredAllOf;
      }
    }

    return filteredResult;
  }

  // 辅助方法：筛选allOf条件
  filterAllOfCondition(condition, itemsArray) {
    if (!condition || typeof condition !== 'object') {
      return null;
    }

    const filtered = {};

    Object.keys(condition).forEach(key => {
      const value = condition[key];

      if (key === 'properties' && typeof value === 'object') {
        // 筛选properties
        const filteredProps = {};
        Object.keys(value).forEach(propKey => {
          if (itemsArray.includes(propKey)) {
            filteredProps[propKey] = value[propKey];
          }
        });
        if (Object.keys(filteredProps).length > 0) {
          filtered.properties = filteredProps;
        }
      } else if (key === 'required' && Array.isArray(value)) {
        // 筛选required数组
        const filteredRequired = value.filter(item => itemsArray.includes(item));
        if (filteredRequired.length > 0) {
          filtered.required = filteredRequired;
        }
      } else if (key === 'allOf' && Array.isArray(value)) {
        // 递归处理嵌套的allOf
        const filteredNested = value.map(nestedCondition => 
          this.filterAllOfCondition(nestedCondition, itemsArray)
        ).filter(result => result && this.hasRelevantContent(result));
        
        if (filteredNested.length > 0) {
          filtered.allOf = filteredNested;
        }
      } else if (key === 'anyOf' && Array.isArray(value)) {
        // 递归处理anyOf
        const filteredAnyOf = value.map(nestedCondition => 
          this.filterAllOfCondition(nestedCondition, itemsArray)
        ).filter(result => result && this.hasRelevantContent(result));
        
        if (filteredAnyOf.length > 0) {
          filtered.anyOf = filteredAnyOf;
        }
      } else if (key === 'if' || key === 'then' || key === 'else') {
        // 递归处理条件逻辑
        const filteredCondition = this.filterAllOfCondition(value, itemsArray);
        if (filteredCondition && this.hasRelevantContent(filteredCondition)) {
          filtered[key] = filteredCondition;
        }
      } else if (key === 'not' && typeof value === 'object') {
        // 递归处理not条件
        const filteredNot = this.filterAllOfCondition(value, itemsArray);
        if (filteredNot && this.hasRelevantContent(filteredNot)) {
          filtered.not = filteredNot;
        }
      } else {
        // 其他属性保持不变
        filtered[key] = value;
      }
    });

    return Object.keys(filtered).length > 0 ? filtered : null;
  }

  // 辅助方法：检查对象是否包含相关内容
  hasRelevantContent(obj) {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    // 检查是否有properties或required
    if (obj.properties && Object.keys(obj.properties).length > 0) {
      return true;
    }
    if (obj.required && obj.required.length > 0) {
      return true;
    }

    // 递归检查嵌套结构
    if (obj.allOf && obj.allOf.length > 0) {
      return true;
    }
    if (obj.anyOf && obj.anyOf.length > 0) {
      return true;
    }
    if (obj.if || obj.then || obj.else || obj.not) {
      return true;
    }

    // 如果有其他非空属性，也认为有相关内容
    return Object.keys(obj).length > 0;
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
      gemini: [
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (最新最强)' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (最快性价比)' },
        { value: 'gemini-2.5-flash-lite-preview-06-17', label: 'Gemini 2.5 Flash-Lite (预览)' },
        { value: 'gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (稳定版)' },
        { value: 'gemini-2.0-flash-lite-001', label: 'Gemini 2.0 Flash-Lite (轻量版)' },
        { value: 'gemini-1.5-pro-002', label: 'Gemini 1.5 Pro (002)' },
        { value: 'gemini-1.5-flash-002', label: 'Gemini 1.5 Flash (002)' },
        { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash-8B (小型)' },
        { value: 'gemini-1.5-pro-001', label: 'Gemini 1.5 Pro (001)' },
        { value: 'gemini-1.5-flash-001', label: 'Gemini 1.5 Flash (001)' },
      ],
      zhipu: [
        { value: 'glm-4', label: 'GLM-4 (基础对话模型)' },
        { value: 'glm-4-plus', label: 'GLM-4-Plus (高性能商业版)' },
        { value: 'glm-4-air', label: 'GLM-4-Air (轻量商业版)' },
        { value: 'glm-4-flash', label: 'GLM-4-Flash (免费高速版)' },
        { value: 'glm-4-long', label: 'GLM-4-Long (长上下文版)' },
        { value: 'glm-4v', label: 'GLM-4V (多模态版本)' },
        { value: 'glm-4-0520', label: 'GLM-4-0520 (稳定版)' },
        { value: 'glm-4-airx', label: 'GLM-4-AirX (极速版)' },
        { value: 'charglm-3', label: 'CharGLM-3 (角色扮演)' },
        { value: 'emohaa', label: 'Emohaa (情感理解)' },
      ],
      qwen: [
        { value: 'qwen3-235b-a22b', label: 'Qwen3-235B-A22B (最新旗舰版)' },
        { value: 'qwen3-32b', label: 'Qwen3-32B (中型高效)' },
        { value: 'qwen3-14b', label: 'Qwen3-14B (小型快速)' },
        { value: 'qwen-max', label: 'Qwen-Max (最强商业版)' },
        { value: 'qwen-plus', label: 'Qwen-Plus (均衡性价比)' },
        { value: 'qwen-turbo', label: 'Qwen-Turbo (最快最便宜)' },
        { value: 'qwen-long', label: 'Qwen-Long (长上下文)' },
        { value: 'qwen-vl-max', label: 'Qwen-VL-Max (多模态视觉)' },
        { value: 'qwen-coder-plus', label: 'Qwen-Coder-Plus (代码专用)' },
        { value: 'qwen-math-plus', label: 'Qwen-Math-Plus (数学专用)' },
      ],
      doubao: [ // https://www.volcengine.com/docs/82379/1330310 模型列表
        { value: 'doubao-seed-1-6-250615', label: 'doubao-seed-1-6-250615 (专业版256K)' },
      ],
      kimi: [
        { value: 'kimi-k2-0711-preview', label: 'Kimi K2 (最新开源智能体模型)' },
      ],
    };
  }
}


module.exports = AiService;
