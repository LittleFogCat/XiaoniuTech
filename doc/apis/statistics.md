# 访问统计接口

所有接口路径前缀均为 `/api`。

## 通用对象

**汇总对象字段**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| pv | number | 是 | 页面访问量，例如 `120`。 |
| uv | number | 是 | 独立访客数，按 `cid` 聚合，例如 `48`。 |
| bounceRate | number | 是 | 跳出率百分比，例如 `37.5`。 |
| avgDuration | number | 是 | 平均访问时长，单位毫秒，例如 `25340`。 |
| avgPagesPerVisit | number | 是 | 平均每次访问浏览页数，例如 `2.5`。 |

### 记录页面进入

**接口描述**

创建一次新的访问记录，返回 `visitId` 供离开页面时回填。

**请求路径**

`POST /api/statistics/enter`

**路径参数**

无。

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| cid | string | 是 | 客户端访客标识，例如 `6b3f3e62-7c32-4b14-bbaf-6da796f2d86e`。 |
| path | string | 是 | 当前页面路径，例如 `/blog/post/abc123`。服务端会规范化为 pathname。 |
| referer | string | 否 | 来源页 URL，例如 `https://example.com/blog`。未传时后端会回退到请求头中的 `referer`。 |
| ua | string | 否 | User-Agent 字符串；未传时后端会回退到请求头中的 `user-agent`。 |
| enterTime | string\|number | 否 | 进入页面时间；不传时使用服务器当前时间。 |

**请求示例**

```json
{
  "cid": "6b3f3e62-7c32-4b14-bbaf-6da796f2d86e",
  "path": "/blog/post/abc123",
  "referer": "https://example.com/blog",
  "ua": "Mozilla/5.0",
  "enterTime": "2026-05-11T08:00:00.000Z"
}
```

**返回示例**

```json
{
  "visitId": "682080e1d5f0c7cde8b47e8b",
  "enterTime": 1778486400000
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| visitId | string | 是 | 新建访问记录 ID，例如 `682080e1d5f0c7cde8b47e8b`。 |
| enterTime | number | 是 | 实际记录的进入时间，Unix 毫秒时间戳。 |

**所需权限**

无需登录。

**其他说明**

接口成功时返回 `201`。

### 记录页面离开

**接口描述**

补全一次访问记录的离开时间和停留时长。前端可以使用普通 POST，也可以通过 `navigator.sendBeacon` 上报。

**请求路径**

`POST /api/statistics/exit`

**路径参数**

无。

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| visitId | string | 否 | 进入接口返回的访问记录 ID。优先使用该字段匹配。 |
| cid | string | 否 | 访客标识；当未传 `visitId` 时，后端会尝试用 `cid + path` 匹配最近 30 分钟内未完成的记录。 |
| path | string | 否 | 当前页面路径，例如 `/blog/post/abc123`。 |
| exitTime | string\|number | 否 | 离开时间；不传时使用服务器当前时间。 |
| duration | number | 否 | 停留时长，单位毫秒，例如 `45320`。 |

**请求示例**

```json
{
  "visitId": "682080e1d5f0c7cde8b47e8b",
  "cid": "6b3f3e62-7c32-4b14-bbaf-6da796f2d86e",
  "path": "/blog/post/abc123",
  "exitTime": "2026-05-11T08:02:10.000Z",
  "duration": 130000
}
```

**返回示例**

```json
{
  "success": true,
  "skipped": false
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| success | boolean | 是 | 请求是否成功，成功时固定为 `true`。 |
| skipped | boolean | 是 | 是否因为没有找到待补全的访问记录而跳过写入。 |

**所需权限**

无需登录。

**其他说明**

即使没有找到可更新的访问记录，接口也会返回 `200` 且 `skipped: true`。

### 获取统计概览

**接口描述**

按不同子视图和时间范围获取访问统计数据。

**请求路径**

`GET /api/statistics/overview`

**路径参数**

无。

**查询参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| sub | string | 否 | 子视图类型。可选值：`overview`、`access_trend`、`sources`、`pages`、`visitors`、`regions`。默认 `overview`。 |
| range | string | 否 | 时间范围。可选值：`today`、`week`、`month`、`year`。默认 `today`。 |

**返回示例**

`sub=overview`：

```json
{
  "summary": {
    "pv": 120,
    "uv": 48,
    "bounceRate": 37.5,
    "avgDuration": 25340,
    "avgPagesPerVisit": 2.5
  },
  "range": "today",
  "cards": {
    "accessTrend": [
      {
        "label": "08:00",
        "pv": 12,
        "uv": 8,
        "bounceRate": 25,
        "avgDuration": 20340,
        "avgPagesPerVisit": 1.5
      }
    ],
    "sources": [],
    "pages": [],
    "visitors": {
      "visitorSummary": {
        "newVisitor": {
          "pv": 80,
          "uv": 30,
          "bounceRate": 40,
          "avgDuration": 18000,
          "avgPagesPerVisit": 2
        },
        "returningVisitor": {
          "pv": 40,
          "uv": 18,
          "bounceRate": 33.33,
          "avgDuration": 32000,
          "avgPagesPerVisit": 3
        }
      },
      "details": []
    },
    "regions": []
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| summary | object | 是 | 汇总对象，字段见本文档“汇总对象字段”。 |
| range | string | 是 | 实际统计范围，例如 `today`。 |
| cards | object | 否 | 仅在 `sub=overview` 时返回，包含多个卡片数据。 |
| rows | array<object> | 否 | 在 `sub=access_trend`、`sources`、`pages`、`regions` 时返回；每项均包含 `label` 和汇总对象字段。 |
| visitorSummary | object | 否 | 在 `sub=visitors` 时返回，包含 `newVisitor` 和 `returningVisitor` 两组汇总对象。 |
| details | array<object> | 否 | 在 `sub=visitors` 时返回，最近 50 条访客明细，字段包括 `id`、`time`、`ip`、`maskedIp`、`pv`、`source`、`visitorType`。 |

**所需权限**

需要 `statistics:view` 权限。

**其他说明**

可能返回的错误状态码：`401`（未登录或登录失效）、`403`（没有权限或账号在黑名单中）。

### 导出统计数据

**接口描述**

导出统计趋势数据 CSV 文件。

**请求路径**

`GET /api/statistics/export`

**路径参数**

无。

**查询参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| range | string | 否 | 时间范围。可选值：`today`、`week`、`month`、`year`。默认 `today`。 |

**返回示例**

此接口直接返回带 BOM 的 CSV 文本，文件名格式为 `statistics_<range>.csv`。

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| 响应体 | text/csv | 是 | CSV 内容，首行表头为 `时间,PV,UV,跳出率,平均访问时长,平均访问页数`。 |

**所需权限**

需要 `statistics:export` 权限。

**其他说明**

响应头包含 `Content-Disposition: attachment; filename="statistics_<range>.csv"`。
