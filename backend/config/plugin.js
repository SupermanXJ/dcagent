/** @type Egg.EggPlugin */
module.exports = {
  // had enabled by egg
  // static: {
  //   enable: true,
  // }

  // 启用CORS插件
  cors: {
    enable: true,
    package: 'egg-cors',
  },

  // 启用文件上传插件
  multipart: {
    enable: true,
    package: 'egg-multipart',
  },

  // 启用参数验证插件
  validate: {
    enable: true,
    package: 'egg-validate',
  },
};
