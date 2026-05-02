# AI 聊天网站搭建计划 v1.0

## 项目概述

- **项目名称**: AI Chat 助手
- **类型**: 全栈 Web 应用
- **技术栈**: React + Express + MongoDB

## 功能模块

### 1. 基础聊天功能
- 聊天界面（类似 ChatGPT）
- 流式输出（SSE）
- Markdown 渲染
- 代码高亮

### 2. 多模型切换
- 从 models.json 读取模型列表
- 前端动态渲染模型选择器
- 后端统一调用接口

### 3. 对话历史（基础版）
- MongoDB 存储对话
- 支持会话分组

### 4. 用户系统（暂不实现）

## 技术栈

### 后端
- Node.js + Express
- MongoDB (Docker 部署)
- models.json 配置文件

### 前端
- React 18 + Vite
- Tailwind CSS
- Radix UI

## 项目结构

```
chat/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatMessage.jsx
│   │   │   ├── ChatInput.jsx
│   │   │   └── ModelSelect.jsx
│   │   ├── pages/
│   │   │   └── ChatPage.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.jsx
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── models.js
│   │   ├── routes/
│   │   │   └── chat.js
│   │   ├── services/
│   │   │   └── provider.js
│   │   └── index.js
│   ├── models.json
│   └── package.json
│
├── docker-compose.yml
└── plan/
```

## API 设计

### GET /api/models
获取所有可用模型列表

### POST /api/chat
流式聊天接口

Request:
```json
{
  "model": "glm-5.1",
  "messages": [
    {"role": "user", "content": "你好"}
  ]
}
```

Response (SSE 流式):
```
data: {"content": "你"}
data: {"content": "好"}
data: {"content": "！"}
data: [DONE]
```

## Docker 部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: chat-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: chat123456
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

## 实现顺序

1. Docker Compose → 启动 MongoDB
2. 后端 - models.json + Provider 服务
3. 后端 - 聊天路由 + SSE
4. 前端 - Vite 项目初始化
5. 前端 - 聊天界面组件
6. 前端 - API 调用
7. 联调测试