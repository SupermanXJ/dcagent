# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DC智能体 (DC Agent) is a multi-model AI chat platform supporting OpenAI, Claude, Google Gemini, 智谱AI (Zhipu), 通义千问 (Qwen), and 豆包 (Doubao). It's a full-stack web application built with Egg.js (backend) and UmiJS (frontend).

## Key Commands

### Development
```bash
# Install all dependencies (uses pnpm)
./install.sh

# Start development servers (frontend + backend)
npm run dev

# Run linting
cd backend && pnpm run lint
cd frontend && pnpm run format

# Run tests
npm test

# Build frontend for production
npm run build
```

### Production
```bash
# Start services
./start.sh

# Stop services  
./stop.sh
```

### Testing AI Integrations
```bash
# Test Qwen integration
./test_qwen.sh
```

## Architecture Overview

### Backend Architecture (Egg.js)
- **Controller Layer** (`backend/app/controller/`): HTTP endpoint handlers
  - `chat.js`: Main chat endpoints (/api/chat/send, /api/chat/models, /api/chat/upload)
  - `home.js`: Basic endpoints and health checks
  
- **Service Layer** (`backend/app/service/`):
  - `ai.js`: Unified AI provider abstraction layer that handles all 6 AI providers
    - Implements session state management for OpenAI using Responses API
    - Handles file processing and message formatting for each provider
    - Provides fallback mechanisms for API compatibility

- **Configuration** (`backend/config/`):
  - Environment-based configuration with dotenv
  - CORS and multipart file upload support
  - Provider-specific API configurations

### Frontend Architecture (UmiJS + React)
- **Pages** (`frontend/src/pages/`): Main application views
  - `Chat/`: Main chat interface with model selection and file upload
  - `Settings/`: Configuration and API key management
  - `Home/`: Landing page
  - `Files/`: File management interface

- **Services** (`frontend/src/services/`): API communication layer
- **Models** (`frontend/src/models/`): State management using dva
- **Components** (`frontend/src/components/`): Reusable UI components

### AI Provider Integration Pattern

All AI providers follow a unified integration pattern in `backend/app/service/ai.js`:

1. Client initialization in constructor with API keys from config
2. Provider-specific chat method (e.g., `chatWithOpenAI`, `chatWithClaude`)
3. Message processing with file content injection
4. Response formatting to unified structure

Special considerations:
- OpenAI: Supports Responses API for session continuity
- Qwen/Doubao: Use OpenAI-compatible API format
- Gemini: Requires content format conversion
- Zhipu: Uses native SDK with specific message formatting

### File Processing

The system supports uploading and processing various file types (txt, pdf, docx, md, json, csv):
- Files are temporarily stored in `backend/app/public/uploads/`
- Content is extracted and injected into messages
- File references are included in AI context

## Environment Configuration

Required environment variables in `backend/.env`:
```bash
OPENAI_API_KEY=your_key
CLAUDE_API_KEY=your_key  
GEMINI_API_KEY=your_key
ZHIPU_API_KEY=your_key
DASHSCOPE_API_KEY=your_key  # For Qwen
DOUBAO_API_KEY=your_key
```

## Common Development Tasks

### Adding a New AI Provider
1. Add provider configuration in `backend/config/config.default.js`
2. Initialize client in `backend/app/service/ai.js` constructor
3. Implement `chatWith[Provider]` method in ai.js
4. Add provider to model list in controller
5. Update frontend model selection UI

### Modifying Chat Behavior
- Main chat logic: `backend/app/controller/chat.js:send()`
- Message processing: `backend/app/service/ai.js:processMessagesWithFiles()`
- Response streaming: Look for `stream` handling in provider methods

### Debugging API Issues
- Check logs in `backend/logs/`
- Enable debug logging in `backend/config/config.default.js`
- Test specific provider with scripts in `scripts/` directory

## Code Conventions

- Use ES6+ JavaScript features in backend
- Follow Egg.js conventions for controllers/services
- Use TypeScript in frontend code
- Follow UmiJS/dva patterns for state management
- Maintain error handling with try-catch blocks
- Log errors with appropriate context using `this.logger`