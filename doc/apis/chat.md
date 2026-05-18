# 聊天接口

聊天相关接口分为三类：

- `/api/chat`、`/api/chat/models`、`/api/chat/agents`：公开聊天能力与元数据。
- `/api/chats*`：登录用户的聊天记录接口。
- `/api/chat/management/*`：后台聊天模型与智能体管理接口。

## 通用对象

**聊天对象字段**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 是 | 聊天记录 ID。 |
| userId | string | 是 | 所属用户邮箱，例如 `user@example.com`。 |
| title | string | 是 | 聊天标题，例如 `新对话`。 |
| model | string | 是 | 模型 ID，例如 `deepseek/deepseek-v4-flash`。 |
| chatTarget | object\|null | 是 | 聊天目标；当为智能体会话时为 `{ "type": "identity", "id": "xiaonaimo" }`。 |
| messages | array\<object\> | 否 | 消息数组，元素包含 `role`（`user`、`assistant`、`system`）和 `content`。仅详情、创建、更新接口会返回。 |
| createdAt | number\|null | 是 | 创建时间，Unix 毫秒时间戳。 |
| updatedAt | number\|null | 是 | 更新时间，Unix 毫秒时间戳。 |

**公开模型对象字段**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 是 | 模型唯一 ID，例如 `deepseek/deepseek-v4-flash`。 |
| name | string | 是 | 模型名称。 |
| provider | string | 是 | 提供商标识，例如 `deepseek`。 |
| free | boolean | 是 | 是否为免费模型。 |
| reasoning | boolean | 是 | 是否为推理模型。 |
| contextWindow | number\|null | 是 | 上下文窗口大小。 |
| maxTokens | number\|null | 是 | 最大输出 token 数。 |

**公开智能体对象字段**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 是 | 智能体 ID，例如 `xiaonaimo`。 |
| name | string | 是 | 智能体名称。 |
| role | string | 是 | 角色标签，例如 `客服`。 |
| description | string | 是 | 智能体简介。 |
| avatarUrl | string | 是 | 头像 URL。 |
| free | boolean | 是 | 是否为免费智能体。 |

### 发起聊天流式请求

**接口描述**

向指定模型发起流式对话。若指定 `chatTarget` 为智能体，会在服务端自动注入人格提示词并以 SSE 形式逐段返回内容。

**请求路径**

`POST /api/chat`

**路径参数**

无。

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| model | string | 是 | 模型 ID，例如 `deepseek/deepseek-v4-flash`。 |
| messages | array\<object\> | 是 | 消息数组，至少 1 项；每项包含 `role` 和 `content`。 |
| messages[].role | string | 是 | 消息角色，可选值：`user`、`assistant`、`system`。 |
| messages[].content | string | 是 | 消息内容。 |
| chatTarget | object\|null | 否 | 聊天目标。仅支持 `{ "type": "identity", "id": "xiaonaimo" }`。 |
| thinking | object | 否 | 原样透传给上游模型的思考参数，例如 `{ "type": "enabled" }`。具体支持与字段格式取决于所选模型提供商。 |
| max_tokens | number | 否 | 最大输出 token 数。默认取模型配置中的 `maxTokens`，再兜底为 `4096`。 |
| temperature | number | 否 | 温度参数，默认 `0.7`。 |
| top_p | number | 否 | `top_p` 参数，默认 `1.0`。 |

**请求示例**

```json
{
  "model": "deepseek/deepseek-v4-flash",
  "messages": [
    {
      "role": "user",
      "content": "你好"
    }
  ],
  "chatTarget": {
    "type": "identity",
    "id": "xiaonaimo"
  },
  "thinking": {
    "type": "enabled"
  },
  "max_tokens": 4096,
  "temperature": 0.7,
  "top_p": 1.0
}
```

**返回示例**

```text

data: {"reasoning_content": "用户说\"你好\"，"}

data: {"reasoning_content": "我"}

data: {"reasoning_content": "只需要"}

data: {"reasoning_content": "简单地回复即可"}

data: {"content":"你"}

data: {"content":"好"}

data: [DONE]
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| SSE data | string | 是 | 以 `data: <json>` 形式持续返回。JSON 正常帧会返回 `{ "content": "文本片段" }`、`{ "reasoning_content": "思考片段" }`，也可能在同一帧中同时包含两者。 |
| SSE 结束标记 | string | 是 | 完成时固定返回 `data: [DONE]`。 |

**所需权限**

无需登录即可调用免费模型/免费智能体；登录用户仍需满足相应权限。

**其他说明**

- 免费模型要求匿名用户或拥有 `chat:chat_free` / `chat:chat_paid` 权限。
- 付费模型要求登录且拥有 `chat:chat_paid` 权限。
- 免费智能体要求匿名用户或拥有 `chat:agent_free` / `chat:agent_paid` 权限；付费智能体要求 `chat:agent_paid` 权限。
- `thinking` 参数不会在服务端做额外解释或转换，而是原样透传给上游模型接口。
- 请求前校验失败时返回 JSON 错误，常见状态码为 `400`、`403`；若流已经开始，后续错误会以 `data: {"error":"..."}` 的 SSE 帧返回。

### 获取聊天记录列表

**接口描述**

获取当前登录用户的聊天记录摘要列表。

**请求路径**

`GET /api/chats`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```json
{
  "chats": [
    {
      "id": "68208d0b37d3c3da1708f4c3",
      "userId": "user@example.com",
      "title": "新对话",
      "model": "deepseek/deepseek-v4-flash",
      "chatTarget": {
        "type": "identity",
        "id": "xiaonaimo"
      },
      "createdAt": 1778486400000,
      "updatedAt": 1778486460000
    }
  ]
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| chats | array<object> | 是 | 聊天对象数组，字段见本文档“聊天对象字段”；该接口不返回 `messages`。 |

**所需权限**

需要 `chat:view` 权限。

**其他说明**

需要登录；当前实现所有异常均统一返回 `500`。

### 获取当前聊天记录

**接口描述**

获取当前用户最近一条聊天记录，或者按 `id` 查询指定聊天记录。

**请求路径**

`GET /api/chats/current`

**路径参数**

无。

**查询参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 否 | 指定聊天记录 ID；不传时返回最近一条聊天记录。 |

**返回示例**

```json
{
  "chat": {
    "id": "68208d0b37d3c3da1708f4c3",
    "userId": "user@example.com",
    "title": "新对话",
    "model": "deepseek/deepseek-v4-flash",
    "chatTarget": null,
    "messages": [
      {
        "role": "user",
        "content": "你好"
      }
    ],
    "createdAt": 1778486400000,
    "updatedAt": 1778486460000
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| chat | object\|null | 是 | 聊天对象；没有任何聊天记录时返回 `null`。 |

**所需权限**

需要 `chat:view` 权限。

**其他说明**

当指定 `id` 但找不到记录时，当前实现会返回 `{"chat": null}`，不会返回 `404`。

### 获取单条聊天记录

**接口描述**

按 ID 获取当前用户的一条完整聊天记录。

**请求路径**

`GET /api/chats/:id`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 是 | 聊天记录 ID。 |

**请求参数**

无。

**返回示例**

```json
{
  "chat": {
    "id": "68208d0b37d3c3da1708f4c3",
    "userId": "user@example.com",
    "title": "新对话",
    "model": "deepseek/deepseek-v4-flash",
    "chatTarget": null,
    "messages": [
      {
        "role": "user",
        "content": "你好"
      },
      {
        "role": "assistant",
        "content": "你好，有什么可以帮你？"
      }
    ],
    "createdAt": 1778486400000,
    "updatedAt": 1778486460000
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| chat | object | 是 | 完整聊天对象，字段见本文档“聊天对象字段”。 |

**所需权限**

需要 `chat:view` 权限。

**其他说明**

找不到聊天记录时返回 `404`；当前实现其它错误统一返回 `500`。

### 创建聊天记录

**接口描述**

创建一条新的聊天记录，可指定标题、模型、消息和智能体聊天目标。

**请求路径**

`POST /api/chats`

**路径参数**

无。

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| title | string | 否 | 聊天标题；不传时默认为智能体名称或 `新对话`。 |
| model | string | 否 | 模型 ID；不传时默认 `glm-5.1`。 |
| messages | array<object> | 否 | 初始消息数组，元素包含 `role` 和 `content`。 |
| chatTarget | object\|null | 否 | 聊天目标，只支持 `{ "type": "identity", "id": "xiaonaimo" }`。 |

**请求示例**

```json
{
  "title": "产品咨询",
  "model": "deepseek/deepseek-v4-flash",
  "messages": [
    {
      "role": "user",
      "content": "你好"
    }
  ],
  "chatTarget": {
    "type": "identity",
    "id": "xiaonaimo"
  }
}
```

**返回示例**

```json
{
  "chat": {
    "id": "68208d0b37d3c3da1708f4c3",
    "userId": "user@example.com",
    "title": "产品咨询",
    "model": "deepseek/deepseek-v4-flash",
    "chatTarget": {
      "type": "identity",
      "id": "xiaonaimo"
    },
    "messages": [
      {
        "role": "user",
        "content": "你好"
      }
    ],
    "createdAt": 1778486400000,
    "updatedAt": 1778486400000
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| chat | object | 是 | 新建后的聊天对象。 |

**所需权限**

需要 `chat:view` 权限。

**其他说明**

- 同一用户对同一 `identity` 智能体只能保留一条绑定会话。
- 当前路由实现没有透传服务层状态码，像“智能体已存在会话”这类校验错误目前也会返回 `500`。

### 更新聊天记录

**接口描述**

更新指定聊天记录的标题、模型、消息或聊天目标。

**请求路径**

`PUT /api/chats/:id`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 是 | 聊天记录 ID。 |

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| title | string | 否 | 新标题；若同时修改 `chatTarget` 且未传标题，则会默认变为智能体名称或 `新对话`。 |
| model | string | 否 | 新模型 ID。 |
| messages | array<object> | 否 | 新消息数组。 |
| chatTarget | object\|null | 否 | 新聊天目标；传 `null` 或空对象可清空。 |

**请求示例**

```json
{
  "title": "新的标题",
  "messages": [
    {
      "role": "user",
      "content": "新的上下文"
    }
  ]
}
```

**返回示例**

```json
{
  "chat": {
    "id": "68208d0b37d3c3da1708f4c3",
    "userId": "user@example.com",
    "title": "新的标题",
    "model": "deepseek/deepseek-v4-flash",
    "chatTarget": null,
    "messages": [
      {
        "role": "user",
        "content": "新的上下文"
      }
    ],
    "createdAt": 1778486400000,
    "updatedAt": 1778486500000
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| chat | object | 是 | 更新后的聊天对象。 |

**所需权限**

需要 `chat:view` 权限。

**其他说明**

找不到聊天记录时返回 `404`；当前路由实现其它校验错误同样可能返回 `500`。

### 删除聊天记录

**接口描述**

删除当前用户的一条聊天记录。

**请求路径**

`DELETE /api/chats/:id`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 是 | 聊天记录 ID。 |

**请求参数**

无。

**返回示例**

```json
{
  "success": true
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| success | boolean | 是 | 删除是否成功。 |

**所需权限**

需要 `chat:view` 权限。

**其他说明**

找不到聊天记录时返回 `404`。

### 获取公开模型列表

**接口描述**

获取所有未删除的聊天模型及默认模型 ID。

**请求路径**

`GET /api/chat/models`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```json
{
  "models": [
    {
      "id": "deepseek/deepseek-v4-flash",
      "name": "deepseek-v4-flash",
      "provider": "deepseek",
      "free": true,
      "reasoning": false,
      "contextWindow": 128000,
      "maxTokens": 8192
    }
  ],
  "defaultModel": "deepseek/deepseek-v4-flash"
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| models | array<object> | 是 | 公开模型数组，字段见本文档“公开模型对象字段”。 |
| defaultModel | string\|null | 是 | 默认模型 ID，没有可用模型时为 `null`。 |

**所需权限**

无需登录。

**其他说明**

该接口仅提供模型元数据，不负责权限过滤；真正使用权限在 `/api/chat` 中校验。

### 获取公开智能体列表

**接口描述**

获取所有未删除的公开智能体元数据。

**请求路径**

`GET /api/chat/agents`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```json
{
  "identities": [
    {
      "id": "xiaonaimo",
      "name": "小奶猫",
      "role": "陪聊",
      "description": "一个会卖萌的智能体。",
      "avatarUrl": "/api/files/68207a7105d9d5a1bc3aa7a5",
      "free": true
    }
  ]
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| identities | array<object> | 是 | 公开智能体数组，字段见本文档“公开智能体对象字段”。 |

**所需权限**

无需登录。

**其他说明**

智能体种子文件来自 `conf/backend/identities/`，后端启动时只会补入 MongoDB 中缺失的记录，不会覆盖已有记录。

### 获取模型管理列表

**接口描述**

获取后台模型管理视图所需的完整模型信息。

**请求路径**

`GET /api/chat/management/models`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```json
{
  "models": [
    {
      "id": "deepseek/deepseek-v4-flash",
      "provider": "deepseek",
      "modelId": "deepseek-v4-flash",
      "name": "deepseek-v4-flash",
      "free": true,
      "reasoning": false,
      "input": [
        "text"
      ],
      "contextWindow": 128000,
      "maxTokens": 8192,
      "compat": {},
      "providerConfig": {
        "baseUrl": "https://api.example.com",
        "api": "openai-completions",
        "apiKey": "${DEEPSEEK_API_KEY}",
        "authHeader": true
      },
      "isDefault": true,
      "source": "seed",
      "createdAt": 1778486400000,
      "updatedAt": 1778486400000
    }
  ]
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| models | array<object> | 是 | 模型管理对象数组。每项包含 `id`、`provider`、`modelId`、`name`、`free`、`reasoning`、`input`、`contextWindow`、`maxTokens`、`compat`、`providerConfig`、`isDefault`、`source`、`createdAt`、`updatedAt`。 |

**所需权限**

需要 `chat:manage_model` 权限。

**其他说明**

该接口返回完整配置，包含提供商连接参数，通常只应用于后台管理界面。

### 创建模型

**接口描述**

创建一个新的聊天模型配置。

**请求路径**

`POST /api/chat/management/models`

**路径参数**

无。

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| provider | string | 是 | 提供商标识，例如 `deepseek`。 |
| modelId | string | 是 | 提供商内部模型 ID，例如 `deepseek-v4-flash`。 |
| name | string | 否 | 展示名称。默认等于 `modelId`。 |
| free | boolean | 否 | 是否为免费模型，默认 `true`。 |
| reasoning | boolean | 否 | 是否为推理模型。 |
| input | array<string> | 否 | 输入能力数组，默认 `["text"]`。 |
| contextWindow | number | 否 | 上下文窗口大小。 |
| maxTokens | number | 否 | 最大输出 token 数。 |
| compat | object | 否 | 兼容性配置对象。 |
| providerConfig | object | 否 | 提供商连接配置对象。 |
| isDefault | boolean | 否 | 是否设为默认模型；传 `true` 会清空其它模型的默认标记。 |
| source | string | 否 | 来源标识，仅 `seed` 或 `manual`，默认 `manual`。 |

**请求示例**

```json
{
  "provider": "deepseek",
  "modelId": "deepseek-v4-flash-copy",
  "name": "DeepSeek Flash Copy",
  "free": true,
  "reasoning": false,
  "input": [
    "text"
  ],
  "contextWindow": 128000,
  "maxTokens": 8192,
  "compat": {},
  "providerConfig": {
    "baseUrl": "https://api.example.com",
    "api": "openai-completions",
    "apiKey": "${DEEPSEEK_API_KEY}",
    "authHeader": true
  },
  "isDefault": false,
  "source": "manual"
}
```

**返回示例**

```json
{
  "model": {
    "id": "6f5f0674-8f2e-42da-88d6-ae5361fd0d83",
    "provider": "deepseek",
    "modelId": "deepseek-v4-flash-copy",
    "name": "DeepSeek Flash Copy",
    "free": true,
    "reasoning": false,
    "input": [
      "text"
    ],
    "contextWindow": 128000,
    "maxTokens": 8192,
    "compat": {},
    "providerConfig": {
      "baseUrl": "https://api.example.com",
      "api": "openai-completions",
      "apiKey": "${DEEPSEEK_API_KEY}",
      "authHeader": true
    },
    "isDefault": false,
    "source": "manual",
    "createdAt": 1778486400000,
    "updatedAt": 1778486400000
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| model | object | 是 | 新建后的模型管理对象。 |

**所需权限**

需要 `chat:manage_model` 权限。

**其他说明**

成功时返回 `201`；若 `provider` 或 `modelId` 为空会返回 `400`。

### 更新模型

**接口描述**

更新指定模型配置。

**请求路径**

`PUT /api/chat/management/models/:modelId`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| modelId | string | 是 | 模型 ID。若原始 ID 中包含 `/`，前端需要先做 URL 编码，例如 `deepseek%2Fdeepseek-v4-flash`。 |

**请求参数**

请求体字段与“创建模型”接口一致。

**请求示例**

```json
{
  "provider": "deepseek",
  "modelId": "deepseek-v4-flash",
  "name": "DeepSeek Flash",
  "isDefault": true
}
```

**返回示例**

```json
{
  "model": {
    "id": "deepseek/deepseek-v4-flash",
    "provider": "deepseek",
    "modelId": "deepseek-v4-flash",
    "name": "DeepSeek Flash",
    "isDefault": true
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| model | object | 是 | 更新后的模型管理对象。 |

**所需权限**

需要 `chat:manage_model` 权限。

**其他说明**

当前路由使用通配路径，文档中的 `:modelId` 代表 URL 编码后的整段模型标识。

### 复制模型

**接口描述**

复制一份现有模型配置，生成新的 UUID 作为模型 ID，并自动追加 `-copy` 后缀。

**请求路径**

`POST /api/chat/management/models/:modelId/copy`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| modelId | string | 是 | 原模型 ID，需做 URL 编码。 |

**请求参数**

无。

**返回示例**

```json
{
  "model": {
    "id": "6f5f0674-8f2e-42da-88d6-ae5361fd0d83",
    "provider": "deepseek",
    "modelId": "deepseek-v4-flash-copy",
    "name": "deepseek-v4-flash-copy",
    "source": "manual"
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| model | object | 是 | 复制后生成的新模型管理对象。 |

**所需权限**

需要 `chat:manage_model` 权限。

**其他说明**

成功时返回 `201`；源模型不存在时返回 `404`。

### 删除模型

**接口描述**

逻辑删除一个模型配置。

**请求路径**

`DELETE /api/chat/management/models/:modelId`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| modelId | string | 是 | 模型 ID，需做 URL 编码。 |

**请求参数**

无。

**返回示例**

```json
{
  "success": true
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| success | boolean | 是 | 是否完成逻辑删除。 |

**所需权限**

需要 `chat:manage_model` 权限。

**其他说明**

删除是逻辑删除，数据会被标记为 `deleted: true`。

### 获取智能体管理列表

**接口描述**

获取后台智能体管理视图所需的完整智能体信息。

**请求路径**

`GET /api/chat/management/agents`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```json
{
  "agents": [
    {
      "id": "xiaonaimo",
      "name": "小奶猫",
      "role": "陪聊",
      "description": "一个会卖萌的智能体。",
      "avatarUrl": "/api/files/68207a7105d9d5a1bc3aa7a5",
      "avatarFileId": "68207a7105d9d5a1bc3aa7a5",
      "personaDefinition": "请扮演一只可爱的奶猫。",
      "systemPrompt": "你是小奶猫。",
      "free": true,
      "source": "seed",
      "seedFile": "xiaonaimo.md",
      "createdAt": 1778486400000,
      "updatedAt": 1778486400000
    }
  ]
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| agents | array<object> | 是 | 智能体管理对象数组。每项包含 `id`、`name`、`role`、`description`、`avatarUrl`、`avatarFileId`、`personaDefinition`、`systemPrompt`、`free`、`source`、`seedFile`、`createdAt`、`updatedAt`。 |

**所需权限**

需要 `chat:manage_agent` 权限。

**其他说明**

后台管理接口返回的是 `agents` 字段，而公开接口 `/api/chat/agents` 返回的是 `identities` 字段。

### 创建智能体

**接口描述**

创建一个新的智能体配置。

**请求路径**

`POST /api/chat/management/agents`

**路径参数**

无。

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 是 | 智能体 ID，例如 `xiaonaimo`。 |
| name | string | 否 | 展示名称；默认等于 `id`。 |
| role | string | 否 | 角色标签。 |
| description | string | 否 | 简介。 |
| avatarFileId | string\|null | 否 | 头像文件 ID。 |
| avatarUrl | string | 否 | 备用头像 URL；仅在明确传入时写入。 |
| personaDefinition | string | 否 | 人格设定文本。 |
| systemPrompt | string | 否 | 系统提示词。 |
| free | boolean | 否 | 是否免费，默认 `true`。 |
| source | string | 否 | 来源标识，仅 `seed` 或 `manual`，默认 `manual`。 |
| seedFile | string | 否 | 种子文件名。 |

**请求示例**

```json
{
  "id": "xiaonaimo",
  "name": "小奶猫",
  "role": "陪聊",
  "description": "一个会卖萌的智能体。",
  "avatarFileId": "68207a7105d9d5a1bc3aa7a5",
  "personaDefinition": "请扮演一只可爱的奶猫。",
  "systemPrompt": "你是小奶猫。",
  "free": true,
  "source": "manual"
}
```

**返回示例**

```json
{
  "agent": {
    "id": "xiaonaimo",
    "name": "小奶猫",
    "role": "陪聊",
    "description": "一个会卖萌的智能体。",
    "avatarUrl": "/api/files/68207a7105d9d5a1bc3aa7a5",
    "avatarFileId": "68207a7105d9d5a1bc3aa7a5",
    "personaDefinition": "请扮演一只可爱的奶猫。",
    "systemPrompt": "你是小奶猫。",
    "free": true,
    "source": "manual",
    "seedFile": "",
    "createdAt": 1778486400000,
    "updatedAt": 1778486400000
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| agent | object | 是 | 新建后的智能体管理对象。 |

**所需权限**

需要 `chat:manage_agent` 权限。

**其他说明**

成功时返回 `201`；如果未传 `id` 或头像文件无效，会返回 `400`。

### 更新智能体

**接口描述**

更新指定智能体配置。

**请求路径**

`PUT /api/chat/management/agents/:id`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 是 | 智能体 ID。 |

**请求参数**

请求体字段与“创建智能体”接口一致，但 `id` 由路径参数提供。

**请求示例**

```json
{
  "name": "小奶猫 Pro",
  "free": false
}
```

**返回示例**

```json
{
  "agent": {
    "id": "xiaonaimo",
    "name": "小奶猫 Pro",
    "free": false
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| agent | object | 是 | 更新后的智能体管理对象。 |

**所需权限**

需要 `chat:manage_agent` 权限。

**其他说明**

路径中的智能体 ID 需要做 URL 编码。

### 删除智能体

**接口描述**

逻辑删除一个智能体配置。

**请求路径**

`DELETE /api/chat/management/agents/:id`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 是 | 智能体 ID。 |

**请求参数**

无。

**返回示例**

```json
{
  "success": true
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| success | boolean | 是 | 是否完成逻辑删除。 |

**所需权限**

需要 `chat:manage_agent` 权限。

**其他说明**

删除是逻辑删除，数据会被标记为 `deleted: true`。
