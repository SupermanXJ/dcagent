/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  // 首页路由
  router.get('/', controller.home.index);

  // 聊天相关路由
  router.post('/api/chat/send', controller.chat.send);
  router.get('/api/chat/models', controller.chat.models);
  router.post('/api/chat/upload', controller.chat.upload);

  // 规则过滤相关路由
  router.post('/api/rule/filter', controller.ruleFilter.filter);
};
