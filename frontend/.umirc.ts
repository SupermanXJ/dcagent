import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: 'DC智能体',
  },
  routes: [
    {
      path: '/',
      redirect: '/chat',
    },
    {
      name: '智能对话',
      path: '/chat',
      component: './Chat',
    },
  ],
  proxy: {
    '/api': {
      target: 'http://localhost:7001',
      changeOrigin: true,
    },
  },
  npmClient: 'pnpm',
});
