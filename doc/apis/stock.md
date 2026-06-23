# 股票模块接口

以下路径省略统一前缀 `/api`。股票模块实际挂载路径为 `/api/stock`，因此文档中的 `/stock/...` 对应真实请求地址 `/api/stock/...`。

所有接口响应均遵循统一 JSON 包裹格式，且 HTTP 状态码固定返回 `200`。业务成功或失败通过响应体中的 `code`、`success`、`msg`、`data` 表达。

## 通用响应包裹

### 成功响应示例

```json
{
  "code": 200,
  "success": true,
  "msg": null,
  "data": {}
}
```

### 失败响应示例

```json
{
  "code": 400,
  "success": false,
  "msg": "请求数据格式错误",
  "data": null
}
```

## 通用对象

### 股市复盘对象字段

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| _id | string | 否 | MongoDB 文档 ID。 |
| date | string | 是 | 复盘日期，格式为 `YYYY-MM-DD`。 |
| markets | object | 是 | 市场总览对象。 |
| todayHot | object | 是 | 今日热点对象。 |
| news | array<object> | 是 | 消息面分类数组。 |
| focusSectors | array<object> | 是 | 明日关注板块数组。 |
| focusStocks | array<object> | 是 | 明日关注个股分组数组。 |
| creator | object | 是 | 创建者信息，由后端根据当前登录令牌或 API Key 自动写入。 |
| title | string | 否 | 文章标题；为空时后端自动生成 `${date} 复盘`。 |
| content | string | 否 | markdown 文章内容；为空时后端自动按模板自动生成。 |
| createdAt | string | 否 | 创建时间。 |
| updatedAt | string | 否 | 更新时间。 |

### creator 字段

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 创建者用户 ID。 |
| nickname | string | 是 | 创建者昵称。 |
| avatar | string | 否 | 创建者头像访问地址；无头像时为空字符串。 |

### markets 字段

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| summary | string | 是 | 市场摘要。 |
| indices | array<object> | 是 | 指数数组。 |
| volume | string | 是 | 量能描述。 |

#### markets.indices[] 字段

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| code | string | 是 | 指数代码。 |
| close | number | 是 | 收盘价。 |
| changePercent | number | 是 | 涨跌幅百分比。 |
| name | string | 是 | 指数名称。 |
| reason | string | 是 | 走势评价。 |

### todayHot 字段

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| topSectors | array<object> | 是 | 热点行业数组。 |
| concepts | array<object> | 是 | 热点概念数组。 |
| fallingSectors | array<object> | 是 | 领跌板块数组。 |
| summary | string | 是 | 当日热点总结。 |

#### todayHot.topSectors[] / todayHot.fallingSectors[] 字段

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 板块名称。 |
| changePercent | number | 是 | 板块涨跌幅百分比。 |
| reason | string | 是 | 板块涨跌逻辑。 |
| stocks | array<object> | 是 | 板块内代表个股数组。 |

#### todayHot.concepts[] 字段

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 概念板块名称。 |
| changePercent | number | 是 | 概念板块涨跌幅百分比。 |
| stocks | array<object> | 是 | 概念板块内代表个股数组。 |

#### todayHot.*[].stocks[] 字段

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| code | string | 是 | 股票代码。 |
| name | string | 是 | 股票名称。 |
| changePercent | number | 是 | 个股涨跌幅百分比。 |

### news[] 字段

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| title | string | 是 | 消息分类标题。 |
| content | array<string> | 是 | 该分类下的 markdown 条目数组。 |

### focusSectors[] 字段

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 板块名称。 |
| reason | string | 是 | 关注理由。 |

### focusStocks[] 字段

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| sector | string | 是 | 所属板块名称。 |
| summary | string | 否 | 该板块下个股的补充说明。 |
| stocks | array<object> | 是 | 个股数组。 |

#### focusStocks[].stocks[] 字段

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| code | string | 是 | 股票代码。 |
| name | string | 是 | 股票名称。 |
| reason | string | 是 | 关注理由。 |

## 接口列表

### 获取股市复盘分页列表

**接口描述**

按日期倒序返回复盘分页列表，支持关键词、日期区间、板块和股票代码筛选。该接口对游客开放；若数据库中某条记录的 `title` 或 `content` 为空，后端会在返回前自动生成并写回数据库。

**请求路径**

`GET /stock/reviews`

**查询参数**

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| page | number | 否 | 页码，默认 `1`。 |
| limit | number | 否 | 每页数量，默认 `20`，最大 `100`。 |
| search | string | 否 | 关键词，匹配日期、标题、正文、市场摘要、热点板块、消息分类、关注板块/个股等字段。 |
| dateFrom | string | 否 | 开始日期，格式 `YYYY-MM-DD`。 |
| dateTo | string | 否 | 结束日期，格式 `YYYY-MM-DD`。 |
| sector | string | 否 | 板块关键词，匹配热点行业、概念、领跌板块、关注板块和个股分组。 |
| stockCode | string | 否 | 股票代码过滤，匹配热点板块个股与关注个股。 |

**返回示例**

```json
{
  "code": 200,
  "success": true,
  "msg": null,
  "data": {
    "reviews": [
      {
        "_id": "68380f2f6a17d7db3772cae4",
        "date": "2026-05-29",
        "markets": {
          "summary": "今日A股三大指数震荡收跌，市场严重分化。",
          "indices": [
            {
              "code": "000001",
              "close": 3300,
              "changePercent": 0.24,
              "name": "上证指数",
              "reason": "资金从科技成长流向消费、红利等防御性板块。"
            }
          ],
          "volume": "成交额合计约3.32万亿。"
        },
        "todayHot": {
          "topSectors": [],
          "concepts": [],
          "fallingSectors": [],
          "summary": "消费复苏是今日最强主线。"
        },
        "news": [],
        "focusSectors": [],
        "focusStocks": [],
        "creator": {
          "id": "6837f1c16a17d7db3772c123",
          "nickname": "小牛",
          "avatar": "/api/files/6837f0b96a17d7db3772c101"
        },
        "title": "2026-05-29 复盘",
        "content": "# 今日盘面\n...",
        "createdAt": "2026-05-29T13:00:00.000Z",
        "updatedAt": "2026-05-29T13:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1
  }
}
```

### 获取股市复盘全量列表

**接口描述**

返回满足筛选条件的全量复盘数据，不分页，适合管理端或导出使用。

**请求路径**

`GET /stock/reviews/all`

**查询参数**

与“获取股市复盘分页列表”一致。

**所需权限**

需要 `stock:review:view_all` 权限。

### 获取单条股市复盘详情

**接口描述**

根据复盘 ID 获取完整详情。该接口对游客开放；若目标记录的 `title` 或 `content` 为空，后端会在返回前自动生成并写回数据库。

**请求路径**

`GET /stock/reviews/:id`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 复盘记录 ID。 |

### 创建股市复盘

**接口描述**

创建一条新的股市复盘。允许存在多条 `date` 相同的记录；`title` 和 `content` 可选，若为空则后端自动生成。

**请求路径**

`POST /stock/reviews`

**请求体要求**

- 请求体结构与“股市复盘对象字段”一致，但无需提交 `_id`、`createdAt`、`updatedAt`。
- `creator` 由后端根据当前登录令牌或 API Key 自动写入，客户端无需也不能自行指定。
- `title`、`content` 为可选字符串；留空或传空字符串时，后端会自动生成。
- 如果 `title` 或 `content` 为空，且后端无法基于其余字段生成对应内容，则返回 `400`。

**所需权限**

需要 `stock:review:create` 权限。

**其他说明**

- 该接口支持两种认证方式：
  - 常规登录令牌：`Authorization: Bearer <token>`
  - 个人 API Key：`X-API-Key: <apiKey>`，也兼容 `Authorization: Bearer <apiKey>`
- 个人 API Key 无过期时间；若用户重新生成或废弃 API Key，旧 Key 会立即失效。
可能返回的错误 `code`：`400`（请求字段格式错误或自动生成失败）、`500`（保存失败，例如数据库索引状态异常）。

### 更新股市复盘

**接口描述**

根据复盘 ID 更新单条记录。允许仅提交需要修改的字段；若更新后 `title` 或 `content` 为空，后端会使用最新记录内容自动补全。

**请求路径**

`PUT /stock/reviews/:id`

**路径参数**

与“获取单条股市复盘详情”一致。

**请求体要求**

- 允许提交部分字段。
- 若显式传入空字符串 `title` 或 `content`，后端会重新自动生成。
- 若自动生成失败，则返回 `400`。

**所需权限**

需要 `stock:review:update` 权限。

### 删除股市复盘

**接口描述**

根据复盘 ID 永久删除一条复盘记录。

**请求路径**

`DELETE /stock/reviews/:id`

**路径参数**

与“获取单条股市复盘详情”一致。

**返回示例**

```json
{
  "code": 200,
  "success": true,
  "msg": null,
  "data": {
    "success": true,
    "id": "68380f2f6a17d7db3772cae4"
  }
}
```

**所需权限**

需要 `stock:review:delete` 权限。

## 权限清单

股票模块当前包含以下权限项：

- `stock:review:view`
- `stock:review:view_all`
- `stock:review:create`
- `stock:review:update`
- `stock:review:delete`

其中，分页列表接口 `GET /stock/reviews` 与详情接口 `GET /stock/reviews/:id` 当前对游客开放，不再要求 `stock:review:view` 权限；其余接口仍按上表执行权限控制。