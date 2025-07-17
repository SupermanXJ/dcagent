'use strict';

const { Controller } = require('egg');
const fs = require('fs').promises;

class RuleFilterController extends Controller {
  async filter() {
    const { ctx } = this;
    
    try {
      // 获取上传的文件
      const file = ctx.request.files && ctx.request.files[0];
      if (!file) {
        ctx.body = {
          success: false,
          message: '请上传规则文件',
        };
        return;
      }

      // 获取输入框中的items
      const { items } = ctx.request.body;
      if (!items) {
        ctx.body = {
          success: false,
          message: '请输入要过滤的项目列表',
        };
        return;
      }

      // 读取上传的文件内容
      const fileContent = await fs.readFile(file.filepath, 'utf-8');
      let rulesData;
      
      try {
        rulesData = JSON.parse(fileContent);
      } catch (parseError) {
        ctx.body = {
          success: false,
          message: '上传的文件不是有效的JSON格式',
        };
        return;
      }

      // 将items字符串转换为数组
      let itemsArray;
      try {
        // 尝试作为JSON数组解析
        itemsArray = JSON.parse(items);
        if (!Array.isArray(itemsArray)) {
          throw new Error('Not an array');
        }
      } catch (e) {
        // 如果不是JSON数组，尝试按逗号分割
        itemsArray = items.split(',').map(item => item.trim()).filter(item => item);
      }

      // 调用AI服务的filterRulesByItems方法
      const filteredResult = ctx.service.ai.filterRulesByItems(rulesData, itemsArray);

      ctx.body = {
        success: true,
        data: filteredResult,
      };
    } catch (error) {
      ctx.logger.error('Rule filter error:', error);
      ctx.body = {
        success: false,
        message: '处理失败: ' + error.message,
      };
    } finally {
      // 清理临时文件
      await ctx.cleanupRequestFiles();
    }
  }
}

module.exports = RuleFilterController;