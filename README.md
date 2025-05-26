# DC智能体

一款支持多模型的智能对话平台，支持OpenAI和Claude AI模型。

## 功能特性

- 🤖 支持多种AI模型（OpenAI、Claude）
- 📁 支持文件上传和处理
- 💬 有状态的对话体验
- 🎨 现代化的用户界面
- ⚡ 实时响应

## 技术栈

### 后端
- **框架**: Egg.js
- **语言**: Node.js

### 前端
- **框架**: UmiJS
- **UI库**: Ant Design
- **语言**: React + TypeScript

## 项目结构

```
dcagent/
├── package.json          # 主项目配置
├── backend/              # Egg.js 后端项目
│   ├── app/             # 应用目录
│   │   ├── controller/  # 控制器
│   │   ├── service/     # 服务层
│   │   └── router.js    # 路由配置
│   ├── config/          # 配置文件
│   └── package.json     # 后端依赖
├── frontend/            # UmiJS 前端项目
│   ├── src/            # 源码目录
│   │   └── pages/      # 页面组件
│   ├── .umirc.ts       # UmiJS配置
│   └── package.json    # 前端依赖
├── install.sh          # 安装脚本
├── start.sh            # 启动脚本
└── README.md           # 项目说明
```

## 快速开始

### 方法一：使用脚本（推荐）

1. **安装依赖**
```bash
./install.sh
```

2. **配置API密钥**
```bash
# 复制环境变量模板
cp backend/env.example backend/.env

# 编辑环境变量文件，添加您的API密钥
vim backend/.env
```

3. **启动项目**
```bash
./start.sh
```

### 方法二：手动安装

1. **安装依赖**
```bash
# 安装主项目依赖
npm install

# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install
```

2. **配置环境变量**
```bash
# 在backend目录下创建.env文件
cd backend
cp env.example .env
# 编辑.env文件，添加您的API密钥
```

3. **启动开发环境**
```bash
# 回到主目录
cd ..

# 同时启动前后端
npm run dev

# 或者分别启动
npm run backend:dev    # 启动后端
npm run frontend:dev   # 启动前端
```

## 服务地址

启动成功后，您可以访问：
- **前端界面**: http://localhost:8000
- **后端API**: http://localhost:7001

## 环境变量配置

在 `backend/.env` 文件中配置以下环境变量：

```bash
# AI模型配置
OPENAI_API_KEY=your_openai_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here

# 服务配置
PORT=7001
NODE_ENV=development
```

## 使用说明

1. 打开浏览器访问 http://localhost:8000
2. 选择AI提供商（OpenAI或Claude）
3. 选择对应的模型
4. 可以上传文件或直接输入消息
5. 点击发送开始对话

## API接口

### 获取可用模型
```
GET /api/chat/models
```

### 发送聊天消息
```
POST /api/chat/send
Content-Type: multipart/form-data

参数:
- provider: AI提供商 (openai/claude)
- model: 模型名称
- message: 消息内容
- history: 对话历史 (JSON字符串)
- files: 上传的文件 (可选)
```

### 文件上传
```
POST /api/chat/upload
Content-Type: multipart/form-data

参数:
- files: 要上传的文件
```

## 故障排除

### npm安装失败
如果遇到npm安装问题，可以尝试：
```bash
# 清理npm缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install
```

### 端口冲突
如果端口被占用，可以修改配置：
- 后端端口：修改 `backend/config/config.default.js` 中的端口配置
- 前端端口：修改 `frontend/.umirc.ts` 中的端口配置

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License 