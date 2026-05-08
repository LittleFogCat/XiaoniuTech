# Chat 模块

所有路径前缀 `/api`。

## 聊天 (SSE 流式)

### POST /api/chat

不要求认证（游客可访问），但有模型/智能体权限控制。

```json
// Request
{
  "model": "deepseek/deepseek-v4-flash",
  "messages": [{ "role": "user", "content": "你好" }],
  "chatTarget": { "type": "identity", "id": "xiaonaimo" },
  "max_tokens": 4096,
  "temperature": 0.7,
  "top_p": 1.0
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| model | string | 是 | `provider/modelId` 格式 |
| messages | array | 是 | 消息列表 |
| chatTarget | object | 否 | `{ type, id }`，type 为 `identity` 时注入智能体人格 |
| max_tokens | number | 否 | 默认 4096 |
| temperature | number | 否 | 默认 0.7 |
| top_p | number | 否 | 默认 1.0 |

**响应 (SSE)**
```
data: {"content":"你"}
data: [DONE]
```

## 聊天记录 CRUD

所有接口需要 `chat:view` 权限。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/chats | 列出当前用户聊天 |
| GET | /api/chats/current | 最近聊天，支持 `?id=` |
| GET | /api/chats/:id | 获取单个 |
| POST | /api/chats | 创建 |
| PUT | /api/chats/:id | 更新 |
| DELETE | /api/chats/:id | 删除 |

## 模型列表

### GET /api/models

```json
{
  "models": [
    { "id": "deepseek/deepseek-v4-flash", "name": "deepseek-v4-flash", "provider": "deepseek", "reasoning": false, "free": true, "contextWindow": 128000, "maxTokens": 8192 }
  ],
  "defaultModel": "deepseek/deepseek-v4-flash"
}
```

## 智能体列表

### GET /api/identities

```json
{
  "identities": [
    { "id": "agent-id", "name": "名称", "role": "标签", "description": "简介", "avatarUrl": "", "free": true }
  ]
}
```

智能体种子文件位于 `conf/backend/identities/`，后端启动时自动导入 MongoDB，已存在记录不覆盖。

## 聊天管理 (admin)

所有接口需要对应权限。

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/chat-management/models | `chat:manage_model` | 列出模型 |
| POST | /api/chat-management/models | `chat:manage_model` | 新增模型 |
| PUT | /api/chat-management/models/:id | `chat:manage_model` | 更新模型 |
| DELETE | /api/chat-management/models/:id | `chat:manage_model` | 删除模型 |
| GET | /api/chat-management/agents | `chat:manage_agent` | 列出智能体 |
| POST | /api/chat-management/agents | `chat:manage_agent` | 新增智能体 |
| PUT | /api/chat-management/agents/:id | `chat:manage_agent` | 更新智能体 |
| DELETE | /api/chat-management/agents/:id | `chat:manage_agent` | 删除智能体 |
