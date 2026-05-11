# 博客接口

所有接口路径前缀均为 `/api/blog`。

## 通用对象

**文章对象字段**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| _id | string | 否 | MongoDB 文档 ID。列表和详情接口通常都会返回。 |
| title | string | 是 | 文章标题，例如 `Vite 部署记录`。 |
| slug | string | 是 | 文章唯一标识，创建时生成的 16 位十六进制字符串，例如 `3fa2bc11de09a7ef`。 |
| content | string | 否 | Markdown 正文；摘要列表接口通常不返回该字段。 |
| excerpt | string | 否 | 自动生成的文章摘要。 |
| tags | array<string> | 是 | 标签数组，例如 `["React","部署"]`。 |
| author | string | 是 | 作者账号邮箱，例如 `user@example.com`。 |
| published | boolean | 是 | 是否已发布。 |
| publishedAt | string\|null | 是 | 发布时间，未发布时为 `null`。 |
| viewCount | number | 是 | 阅读数。 |
| wordCount | number | 是 | 字数统计。 |
| likes | number | 是 | 点赞数。 |
| commentCount | number | 是 | 评论数。 |
| trashed | boolean | 是 | 是否在垃圾桶中。 |
| trashedAt | string\|null | 是 | 放入垃圾桶时间。 |
| autosave | object\|null | 否 | 自动保存草稿对象，包含 `title`、`tags`、`content`、`updatedAt`。 |
| createdAt | string | 否 | 创建时间。 |
| updatedAt | string | 否 | 更新时间。 |

**评论对象字段**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| _id | string | 是 | 评论 ID。 |
| postId | string | 是 | 文章 ID。 |
| author | string | 是 | 评论作者邮箱。 |
| content | string | 是 | 评论内容。 |
| authorProfile | object | 是 | 评论作者公开资料，包含 `nickname`、`avatarUrl`。 |
| createdAt | string | 是 | 创建时间。 |
| updatedAt | string | 是 | 更新时间。 |

### 获取文章列表

**接口描述**

获取博客文章分页列表。未登录时仅返回已发布文章；已登录时会额外看到自己的未发布文章，但不会看到垃圾桶文章。

**请求路径**

`GET /api/blog/posts`

**路径参数**

无。

**查询参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| page | number | 否 | 页码，默认 `1`。 |
| limit | number | 否 | 每页数量，默认 `20`，最大 `50`。 |
| search | string | 否 | 搜索关键字，会匹配标题和正文。 |
| tag | string | 否 | 标签过滤，例如 `React`。 |

**返回示例**

```json
{
  "posts": [
    {
      "_id": "682088d46ce5132ea2bc8f12",
      "title": "Vite 部署记录",
      "slug": "3fa2bc11de09a7ef",
      "excerpt": "记录一次从开发到部署的过程...",
      "tags": [
        "Vite",
        "部署"
      ],
      "author": "user@example.com",
      "published": true,
      "publishedAt": "2026-05-11T08:00:00.000Z",
      "viewCount": 12,
      "wordCount": 3200,
      "trashed": false,
      "trashedAt": null,
      "likes": 3,
      "commentCount": 2,
      "createdAt": "2026-05-11T07:55:00.000Z",
      "updatedAt": "2026-05-11T08:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| posts | array<object> | 是 | 文章对象数组，字段见本文档“文章对象字段”；该接口通常不返回 `content`。 |
| total | number | 是 | 总记录数。 |
| page | number | 是 | 当前页码。 |
| totalPages | number | 是 | 总页数。 |

**所需权限**

无需登录；若带有效登录令牌，可附带返回当前登录用户自己的未发布文章。

**其他说明**

文章列表始终排除垃圾桶文章。

### 获取指定用户的公开文章列表

**接口描述**

根据作者昵称分页获取其已发布文章列表，并返回该作者已发布文章总字数。

**请求路径**

`GET /api/blog/users/:nickname/posts`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| nickname | string | 是 | 作者昵称，例如 `XiaoNiu`。 |

**查询参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| page | number | 否 | 页码，默认 `1`。 |
| limit | number | 否 | 每页数量，默认 `20`，最大 `50`。 |

**返回示例**

```json
{
  "posts": [
    {
      "_id": "682088d46ce5132ea2bc8f12",
      "title": "Vite 部署记录",
      "slug": "3fa2bc11de09a7ef",
      "excerpt": "记录一次从开发到部署的过程...",
      "tags": [
        "Vite",
        "部署"
      ],
      "author": "user@example.com",
      "published": true,
      "publishedAt": "2026-05-11T08:00:00.000Z",
      "viewCount": 12,
      "wordCount": 3200,
      "likes": 3,
      "commentCount": 2
    }
  ],
  "total": 1,
  "totalWords": 3200,
  "page": 1,
  "totalPages": 1
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| posts | array<object> | 是 | 该作者的已发布文章数组。 |
| total | number | 是 | 该作者的已发布文章总数。 |
| totalWords | number | 是 | 该作者已发布文章的总字数。 |
| page | number | 是 | 当前页码。 |
| totalPages | number | 是 | 总页数。 |

**所需权限**

无需登录。

**其他说明**

可能返回的错误状态码：`404`（用户不存在）。

### 获取管理页文章列表

**接口描述**

返回当前作者自己的非垃圾桶文章和垃圾桶文章，供管理后台使用。

**请求路径**

`GET /api/blog/posts/manage`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```json
{
  "posts": [
    {
      "_id": "682088d46ce5132ea2bc8f12",
      "title": "Vite 部署记录",
      "slug": "3fa2bc11de09a7ef",
      "tags": [
        "Vite",
        "部署"
      ],
      "published": false,
      "trashed": false,
      "autosave": {
        "title": "Vite 部署记录",
        "tags": [
          "Vite"
        ],
        "content": "草稿内容",
        "updatedAt": "2026-05-11T08:05:00.000Z"
      }
    }
  ],
  "trashed": []
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| posts | array<object> | 是 | 当前作者所有未进垃圾桶的文章数组。 |
| trashed | array<object> | 是 | 当前作者垃圾桶中的文章数组。 |

**所需权限**

需要 `blog:write` 权限。

**其他说明**

当前实现按 `updatedAt` 或 `trashedAt` 倒序返回，不做分页。

### 获取标签统计

**接口描述**

获取所有已发布、未删除文章的标签及出现次数。

**请求路径**

`GET /api/blog/tags`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```json
{
  "tags": [
    {
      "name": "JavaScript",
      "count": 5
    }
  ]
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| tags | array<object> | 是 | 标签数组。 |
| tags[].name | string | 是 | 标签名称，例如 `JavaScript`。 |
| tags[].count | number | 是 | 标签在已发布文章中的出现次数。 |

**所需权限**

无需登录。

**其他说明**

仅统计已发布且未进垃圾桶的文章。

### 获取博客统计

**接口描述**

返回博客公开文章总数和总字数。

**请求路径**

`GET /api/blog/stats`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```json
{
  "totalPosts": 10,
  "totalWords": 50000
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| totalPosts | number | 是 | 已发布文章总数。 |
| totalWords | number | 是 | 已发布文章总字数。 |

**所需权限**

无需登录。

**其他说明**

仅统计已发布且未进垃圾桶的文章。

### 获取单篇文章

**接口描述**

按 slug 获取单篇文章。普通访客只能看到已发布文章；若携带作者本人的有效登录令牌，则也可读取自己未发布但未进垃圾桶的文章。

**请求路径**

`GET /api/blog/posts/:slug`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章唯一标识，例如 `3fa2bc11de09a7ef`。 |

**请求参数**

无。

**返回示例**

```json
{
  "post": {
    "_id": "682088d46ce5132ea2bc8f12",
    "title": "Vite 部署记录",
    "slug": "3fa2bc11de09a7ef",
    "content": "# 标题\n\n正文内容",
    "excerpt": "记录一次从开发到部署的过程...",
    "tags": [
      "Vite",
      "部署"
    ],
    "author": "user@example.com",
    "published": true,
    "publishedAt": "2026-05-11T08:00:00.000Z",
    "viewCount": 12,
    "wordCount": 3200,
    "likes": 3,
    "commentCount": 2,
    "trashed": false,
    "createdAt": "2026-05-11T07:55:00.000Z",
    "updatedAt": "2026-05-11T08:00:00.000Z"
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| post | object | 是 | 文章对象，字段见本文档“文章对象字段”。 |

**所需权限**

无需登录；若想读取自己的未发布文章，需要携带作者本人的登录令牌。

**其他说明**

可能返回的错误状态码：`404`（文章不存在，或当前登录账号不是该未发布文章作者）。

### 记录文章阅读

**接口描述**

尝试为指定文章累加阅读数。

**请求路径**

`POST /api/blog/posts/:slug/view`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章唯一标识。 |

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
| success | boolean | 是 | 调用是否成功，固定为 `true`。 |

**所需权限**

无需登录。

**其他说明**

当前实现即使文章不存在，也不会返回 `404`，而是直接返回 `success: true`。

### 点赞文章

**接口描述**

为指定已发布文章增加 1 次点赞数。

**请求路径**

`POST /api/blog/posts/:slug/like`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章唯一标识。 |

**请求参数**

无。

**返回示例**

```json
{
  "likes": 4
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| likes | number | 是 | 更新后的点赞总数。 |

**所需权限**

无需登录。

**其他说明**

只允许对已发布且未进垃圾桶的文章点赞，文章不存在时返回 `404`。

### 取消点赞文章

**接口描述**

为指定已发布文章减少 1 次点赞数。

**请求路径**

`DELETE /api/blog/posts/:slug/like`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章唯一标识。 |

**请求参数**

无。

**返回示例**

```json
{
  "likes": 3
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| likes | number | 是 | 更新后的点赞总数。 |

**所需权限**

无需登录。

**其他说明**

当前实现只有在文章存在且点赞数大于 0 时才会成功；否则统一返回 `404`。

### 获取作者自己的未发布文章

**接口描述**

只允许文章作者本人读取指定 slug 对应的未发布或草稿文章。

**请求路径**

`GET /api/blog/posts/:slug/unpublished`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章唯一标识。 |

**请求参数**

无。

**返回示例**

```json
{
  "post": {
    "_id": "682088d46ce5132ea2bc8f12",
    "title": "草稿文章",
    "slug": "3fa2bc11de09a7ef",
    "content": "# 草稿内容",
    "tags": [
      "草稿"
    ],
    "published": false,
    "autosave": {
      "title": "草稿文章",
      "tags": [
        "草稿"
      ],
      "content": "临时保存内容",
      "updatedAt": "2026-05-11T08:06:00.000Z"
    }
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| post | object | 是 | 文章对象，字段见本文档“文章对象字段”。 |

**所需权限**

需要登录。

**其他说明**

只有文章作者本人可以访问，不是作者时同样返回 `404`。

### 创建文章

**接口描述**

创建一篇新文章，并自动生成 slug、摘要和字数统计。

**请求路径**

`POST /api/blog/posts`

**路径参数**

无。

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| title | string | 是 | 文章标题，例如 `Vite 部署记录`。 |
| content | string | 是 | Markdown 正文内容。 |
| tags | array<string> | 否 | 标签数组，例如 `["Vite","部署"]`。 |
| published | boolean | 否 | 是否直接发布，默认 `false`。 |

**请求示例**

```json
{
  "title": "Vite 部署记录",
  "content": "# 标题\n\n正文内容",
  "tags": [
    "Vite",
    "部署"
  ],
  "published": true
}
```

**返回示例**

```json
{
  "post": {
    "_id": "682088d46ce5132ea2bc8f12",
    "title": "Vite 部署记录",
    "slug": "3fa2bc11de09a7ef",
    "content": "# 标题\n\n正文内容",
    "excerpt": "标题 正文内容",
    "tags": [
      "Vite",
      "部署"
    ],
    "author": "user@example.com",
    "published": true,
    "publishedAt": "2026-05-11T08:00:00.000Z",
    "wordCount": 12,
    "autosave": null
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| post | object | 是 | 新建后的文章对象。 |

**所需权限**

需要 `blog:write` 权限。

**其他说明**

- 文章 slug 为服务端生成的随机 16 位十六进制字符串，标题修改不会影响 slug。
- 文章中的 Markdown 图片会在创建时做文件引用物化处理。

### 批量导入 Markdown 文章

**接口描述**

批量导入 Markdown 文件列表。每个成功导入的文件都会创建为一篇未发布文章。

**请求路径**

`POST /api/blog/import`

**路径参数**

无。

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| articles | array<object> | 是 | 待导入文件数组。 |
| articles[].name | string | 否 | 文件名，例如 `guide.md`。 |
| articles[].relativePath | string | 否 | 相对路径，例如 `notes/guide.md`；导入结果名称优先取该字段。 |
| articles[].content | string | 是 | Markdown 文件内容。 |

**请求示例**

```json
{
  "articles": [
    {
      "name": "guide.md",
      "relativePath": "notes/guide.md",
      "content": "# 指南\n\n正文"
    }
  ]
}
```

**返回示例**

```json
{
  "results": [
    {
      "name": "notes/guide.md",
      "success": true,
      "post": {
        "_id": "682088d46ce5132ea2bc8f12",
        "title": "guide",
        "slug": "3fa2bc11de09a7ef"
      }
    }
  ],
  "importedCount": 1,
  "failedCount": 0
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| results | array<object> | 是 | 每个输入文件的导入结果。成功时包含 `post`，失败时包含 `error`。 |
| importedCount | number | 是 | 成功导入数量。 |
| failedCount | number | 是 | 导入失败数量。 |

**所需权限**

需要 `blog:write` 权限。

**其他说明**

- 仅支持扩展名为 `.md` 的文件。
- 至少导入成功一篇文章时返回 `201`；全部失败时返回 `400`。

### 更新文章

**接口描述**

更新文章标题、正文、标签和发布状态。只有文章作者本人可以编辑。

**请求路径**

`PUT /api/blog/posts/:slug`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章唯一标识。 |

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| title | string | 否 | 新标题。 |
| content | string | 否 | 新 Markdown 正文。 |
| tags | array<string> | 否 | 新标签数组。 |
| published | boolean | 否 | 是否发布。若状态发生变化，`publishedAt` 会随之更新。 |

**请求示例**

```json
{
  "title": "Vite 部署记录（修订版）",
  "content": "# 标题\n\n更新后的正文",
  "tags": [
    "Vite",
    "部署",
    "修订"
  ],
  "published": true
}
```

**返回示例**

```json
{
  "post": {
    "_id": "682088d46ce5132ea2bc8f12",
    "title": "Vite 部署记录（修订版）",
    "slug": "3fa2bc11de09a7ef",
    "content": "# 标题\n\n更新后的正文",
    "tags": [
      "Vite",
      "部署",
      "修订"
    ],
    "published": true,
    "autosave": null
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| post | object | 是 | 更新后的文章对象。 |

**所需权限**

需要 `blog:update` 权限。

**其他说明**

可能返回的错误状态码：`403`（仅文章作者可编辑）、`404`（文章不存在）。

### 自动保存文章草稿

**接口描述**

保存文章编辑器的临时草稿，不影响正式文章内容。

**请求路径**

`PUT /api/blog/posts/:slug/autosave`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章唯一标识。 |

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| title | string | 否 | 草稿标题；未传时按空字符串存储。 |
| tags | array<string> | 否 | 草稿标签数组。 |
| content | string | 否 | 草稿正文；未传时按空字符串存储。 |

**请求示例**

```json
{
  "title": "Vite 部署记录",
  "tags": [
    "Vite"
  ],
  "content": "临时保存内容"
}
```

**返回示例**

```json
{
  "autosave": {
    "title": "Vite 部署记录",
    "tags": [
      "Vite"
    ],
    "content": "临时保存内容",
    "updatedAt": "2026-05-11T08:05:00.000Z"
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| autosave | object | 是 | 自动保存草稿对象，包含 `title`、`tags`、`content`、`updatedAt`。 |

**所需权限**

需要 `blog:update` 权限。

**其他说明**

只有文章作者本人可以保存自己的草稿。

### 将文章移入垃圾桶

**接口描述**

把一篇文章移入垃圾桶，并自动取消发布状态。

**请求路径**

`PUT /api/blog/posts/:slug/trash`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章唯一标识。 |

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
| success | boolean | 是 | 操作是否成功。 |

**所需权限**

需要 `blog:delete` 权限。

**其他说明**

只有文章作者本人可以操作，成功后会把 `published` 设为 `false`。

### 从垃圾桶恢复文章

**接口描述**

把垃圾桶中的文章恢复为正常状态。

**请求路径**

`PUT /api/blog/posts/:slug/restore`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章唯一标识。 |

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
| success | boolean | 是 | 操作是否成功。 |

**所需权限**

需要 `blog:update` 权限。

**其他说明**

只有文章作者本人可以操作，恢复后不会自动重新发布文章。

### 永久删除文章

**接口描述**

彻底删除一篇已在垃圾桶中的文章，同时删除其评论和关联图片引用记录。

**请求路径**

`DELETE /api/blog/posts/:slug`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章唯一标识。 |

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

需要 `blog:delete` 权限。

**其他说明**

只有处于垃圾桶中的文章可以被永久删除。

### 获取文章评论列表

**接口描述**

分页获取指定文章的评论列表。

**请求路径**

`GET /api/blog/posts/:slug/comments`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章唯一标识。 |

**查询参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| page | number | 否 | 页码，默认 `1`。 |
| limit | number | 否 | 每页数量，默认 `50`，最大 `100`。 |

**返回示例**

```json
{
  "comments": [
    {
      "_id": "682089d74d84dc8c40e99f01",
      "postId": "682088d46ce5132ea2bc8f12",
      "author": "user@example.com",
      "content": "写得很好。",
      "createdAt": "2026-05-11T08:12:00.000Z",
      "updatedAt": "2026-05-11T08:12:00.000Z",
      "authorProfile": {
        "nickname": "XiaoNiu",
        "avatarUrl": "/api/files/68207a7105d9d5a1bc3aa7a5"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| comments | array<object> | 是 | 评论对象数组，字段见本文档“评论对象字段”。 |
| total | number | 是 | 评论总数。 |
| page | number | 是 | 当前页码。 |
| totalPages | number | 是 | 总页数。 |

**所需权限**

无需登录。

**其他说明**

文章不存在时返回 `404`。

### 添加评论

**接口描述**

为指定已发布文章新增一条评论，并同步增加文章评论数。

**请求路径**

`POST /api/blog/posts/:slug/comments`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章唯一标识。 |

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| content | string | 是 | 评论正文，例如 `写得很好。`。 |

**请求示例**

```json
{
  "content": "写得很好。"
}
```

**返回示例**

```json
{
  "comment": {
    "_id": "682089d74d84dc8c40e99f01",
    "postId": "682088d46ce5132ea2bc8f12",
    "author": "user@example.com",
    "content": "写得很好。",
    "createdAt": "2026-05-11T08:12:00.000Z",
    "updatedAt": "2026-05-11T08:12:00.000Z",
    "authorProfile": {
      "nickname": "XiaoNiu",
      "avatarUrl": "/api/files/68207a7105d9d5a1bc3aa7a5"
    }
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| comment | object | 是 | 新增后的评论对象，字段见本文档“评论对象字段”。 |

**所需权限**

需要登录。

**其他说明**

可能返回的错误状态码：`400`（评论内容为空）、`401`、`403`、`404`（文章不存在或未发布）。
