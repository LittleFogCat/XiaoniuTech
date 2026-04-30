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
| max_tokens | number | 否 | 最大生成 token 数，默认 4096 |
| temperature | number | 否 | 温度参数，默认 0.7 |
| top_p | number | 否 | top_p 参数，默认 1.0 |

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