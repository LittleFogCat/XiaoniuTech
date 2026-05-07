# Chat 模块接口

## 获取模型列表

### GET /api/models

获取所有可用的 AI 模型列表

**响应示例**
```json
{
  "models": [
    {
      "id": "glm-5.1",
      "name": "GLM-5.1",
      "provider": "zai",
      "reasoning": true,
      "contextWindow": 202800,
      "maxTokens": 131100
    }
  ]
}
```

---

## 获取智能体列表

### GET /api/identities

获取当前可用的智能体列表。该接口只返回对外展示字段，不返回人格定义原文。
智能体运行时数据来自 MongoDB；部署时会将 `conf/backend/identities/identities.json` 中的元数据与 `conf/backend/identities/persona/*.md` 中的人格正文作为初始化种子导入数据库，后续以数据库记录为准。

**响应示例**
```json
{
  "identities": [
    {
      "id": "小奶茉",
      "name": "小奶茉",
      "role": "猫娘助手",
      "description": "温柔、耐心、带一点灵气的聊天搭子。",
      "avatarUrl": ""
    }
  ]
}
```

**响应字段说明**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 智能体唯一 ID；默认初始化时由 `identities.json` 中的 `id` 决定，运行时以数据库记录为准 |
| name | string | 智能体名称，所有智能体之间不可重名 |
| role | string | 智能体角色标签，可为空 |
| description | string | 智能体简介 |
| avatarUrl | string | 头像 URL，可为空 |

---

## 聊天接口

### POST /api/chat

流式聊天接口

**请求体**
```json
{
  "model": "glm-5.1",
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "chatTarget": {
    "type": "identity",
    "id": "xiaonaimo"
  },
  "max_tokens": 4096,
  "temperature": 0.7,
  "top_p": 1.0
}
```

**参数说明**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| model | string | 是 | 模型 ID |
| messages | array | 是 | 消息列表 |
| chatTarget | object | 否 | 对话目标；为空时为普通聊天，传入 identity 时启用智能体人格 |
| max_tokens | number | 否 | 最大生成 token 数，默认 4096 |
| temperature | number | 否 | 温度参数，默认 0.7 |
| top_p | number | 否 | top_p 参数，默认 1.0 |

**chatTarget 字段说明**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 当前仅支持 `identity` |
| id | string | 是 | 智能体 ID，对应 `/api/identities` 中返回的 `id` |

当 `chatTarget.type = identity` 时，后端会从数据库读取对应智能体的人格定义，并将其注入到系统提示词后再请求模型。

**响应 (SSE 流式)**
```
data: {"content": "你"}
data: {"content": "好"}
data: {"content": "！"}
data: [DONE]
```

**响应字段说明**
| 字段 | 类型 | 说明 |
|------|------|------|
| content | string | 生成的文本内容片段 |
| [DONE] | string | 流式结束标记 |

**错误响应**
```json
{
  "error": "Model not found"
}
```

常见错误包括：模型不存在、智能体不存在、数据库中的智能体名称冲突、或请求体缺少必要字段。