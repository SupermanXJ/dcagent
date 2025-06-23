/* eslint valid-jsdoc: "off" */

// 加载环境变量
require('dotenv').config();

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1747994037893_6641';

  // add your middleware config here
  config.middleware = [];

  // CORS配置
  config.cors = {
    origin: '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
  };

  // 安全配置
  config.security = {
    csrf: {
      enable: false,
    },
  };

  // 文件上传配置
  config.multipart = {
    mode: 'file',
    fileSize: '50mb',
    fileExtensions: ['.txt', '.pdf', '.docx', '.doc', '.md', '.json', '.csv'],
  };

  // AI模型配置 (在本地配置文件中设置实际的API密钥)
  config.ai = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: 'https://api.openai.com/v1',
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY || '',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    },
  };

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  return {
    ...config,
    ...userConfig,
  };
};
