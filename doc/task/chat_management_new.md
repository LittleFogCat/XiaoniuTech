# 聊天模块管理

聊天模块目前仅通过手动配置和数据库进行，需要可视化 UI。
仅有拥有 `chat:manage` 权限的用户才能管理聊天模块。

## 1. 聊天模型配置

目前通过 `models.json` 进行配置。

### 1.1 改造思路

聊天模型的配置从文件迁移到数据库。`models.json` 仅用于初始化数据库。

### 1.2 新增

#### 1.2.1 免费

模型需要新增 `free` 字段，用于标记模型是否免费。
UI 上对免费模型标注 `free`，非免费模型不标注。

对于未拥有付费模型权限的用户，只能使用免费模型。当选择付费模型时，弹出联系站长的提示框，具体的联系方式根据

## 2. 智能体配置

目前智能体通过 `identities.json` 进行配置。
当前仅支持聊天人格的配置，需要进行扩展以支持更多智能体的功能。

### 2.1 改造思路

智能体的配置从 `identities` 表迁移到数据库 `agent` 表。`identities.json` 仅用于初始化数据库。

一个完整的智能体囊括几个部分：

- 基础属性：包括基本信息（名称、描述、人格定义等）。
- 会话：包含用户与智能体的聊天记录、上下文等。
- 工具：智能体可以调用的工具，通过系统提示词注入的方式。
- 任务：智能体需要执行的任务。任务隶属于会话，代表了用户某个聊天记录对应的执行任务的意图。

### 2.2 详细描述

目前智能体仅包括人格定义，需要支持更多的功能。

#### 2.2.1 基础属性

新增 `free` 字段，用于标记智能体是否免费。
只有拥有 `chat:agent_paid` 权限的用户才能使用付费智能体。

#### 2.2.2 会话

会话部分保持当前的逻辑。

#### 2.2.3 工具

工具：定义智能体能够调用的工具，如 PDF 转换助手、图片生成功能等。

工具必须暴露 `name`、`description`、`parameters` 等字段。`name` 为工具的唯一标识，`description` 为工具的描述，`parameters` 为工具的参数。

智能体根据任务描述，选择合适的工具进行调用。

#### 2.2.4 任务

任务：任务隶属于会话。当识别到用户执行任务的意图，智能体会根据任务描述进行任务的计划、工具调度和执行。

- 智能体会将任务分解为具体的步骤，通过状态机的方式执行步骤。状态包括：`pending`、`planning`、`running`、`success`、`failed`。
- 根据每一步的执行结果，智能体将判断是否应该继续。如果某一步骤失败，智能体将重新尝试规划并执行步骤。每个步骤都有一个最大重试次数；如果超过最大重试次数，智能体将走失败流程。
- 任务执行失败时，智能体将尝试重新规划并执行步骤。为了避免进入死循环，智能体需要设置一个最大重试次数。如果超过最大执行次数，智能体将自动结束任务。
- 当整个任务执行完毕时，智能体将返回最终结果。

### 2.3 数据库表

`agent` 表：

```json
{
  "_id": "产品策划师若川",
  "avatarUrl": "",
  "createdAt": {
    "$date": "2026-05-02T17:12:06.652Z"
  },
  "description": "擅长梳理需求、规划用户路径和交互优先级的智能体，适合产品设计、功能取舍与需求澄清场景。",
  "name": "若川",
  "personaDefinition": "你是一名思路清晰、善于洞察用户意图的产品策划师，能够把模糊需求整理成清楚的产品方案。\r\n\r\n规则：\r\n1. 面对需求时，先提炼目标用户、使用场景和核心问题。\r\n2. 输出内容时优先关注信息架构、交互路径和优先级，而不是堆砌概念。\r\n3. 如果需求存在冲突，要明确指出冲突点，并给出折中建议。\r\n4. 讨论 UI 时，优先考虑一致性、主次层级与关键任务完成效率。\r\n5. 描述方案时尽量简洁现代，不使用过度营销化语言。\r\n6. 当需求可以拆成阶段时，要给出 MVP 与后续演进建议。\r\n7. 默认使用中文回答。",
  "systemPrompt": "包括工具定义等内容",
  "seedFile": "产品策划师若川.md",
  "source": "seed",
  "updatedAt": {
    "$date": "2026-05-06T11:53:16.068Z"
  },
  "role": "产品策划师",
  "free": true
}
```

`agent_tool` 表：

```json
{
  "_id": {
    "$oid": "69f8909222bee8f382afb587"
  },
  "agentId": {
    "$oid": "69f8909222bee8f382afb584"
  },
  "name": "pdf 转换助手",
  "description": "将 PDF 文件转换为图片、Markdown 等格式",
  "parameters": {
    "type": "object",
    "properties": {
      "originalFile": {
        "type": "string",
        "description": "要转换的 PDF 文件 ID"
      },
      "targetFormat": {
        "type": "string",
        "description": "目标转换格式，可选值为 image、markdown",
        "enum": [
          "image",
          "markdown"
        ]
      }
    },
    "required": [
      "originalFile",
      "targetFormat"
    ]
  },
  "returns": {
    "type": "file",
    "description": "转换后的文件 ID，格式取决于 targetFormat"
  },
  "createdAt": {
    "$date": "2026-05-04T12:26:58.862Z"
  },
  "updatedAt": {
    "$date": "2026-05-04T12:26:58.862Z"
  }
}
```

`agent_task` 表：

```json
{
  "_id": {
    "$oid": "69f8909222bee8f382afb58d"
  },
  "chatId": {
    "$oid": "69f8909222bee8f382afb584"
  },
  "agentId": {
    "$oid": "69f8909222bee8f382afb584"
  },
  "description": "用户要求智能体根据需求文档输出产品方案",
  "status": "pending",
  "input": {
    "userMessage": "帮我把这个pdf转换为图片格式",
    "attachments": [
        {
            "fileId": {
                "$oid": "69f8909222bee8f382afb587"
            },
            "fileType": "pdf"
        }
    ]
  },
  "result": null,
  "retryCount": 0,
  "maxRetryCount": 3,
  "createdAt": {
    "$date": "2026-05-04T12:30:00.000Z"
  },
  "updatedAt": {
    "$date": "2026-05-04T12:30:00.000Z"
  }
}
```

`agent_task_step` 表：

```json
{
  "_id": {
    "$oid": "69f8909222bee8f382afb58e"
  },
  "taskId": {
    "$oid": "69f8909222bee8f382afb58d"
  },
  "step": 0,
  "action": "tool_call",
  "toolName": "pdf 转换助手",
  "params": {
    "originalFile": "69f8909222bee8f382afb587",
    "targetFormat": "image"
  },
  "status": "pending",
  "retryCount": 0,
  "maxRetryCount": 3,
  "result": {
    "success": true,
    "errorMessage": null,
    "output": {
        "imageFileId": {
            "$oid": "69f8909222bee8f382afb588"
        }
    }
  },
  "createdAt": {
    "$date": "2026-05-04T12:30:00.000Z"
  },
  "updatedAt": {
    "$date": "2026-05-04T12:30:00.000Z"
  },
  "finishedAt": {
    "$date": "2026-05-04T12:30:00.000Z"
  }
}
```
