# Blog 模块

所有路径前缀 `/api/blog`。

## 文章列表

### GET /api/blog/posts

不要求认证。已登录用户会额外看到自己的草稿。

**查询参数**: `page`(default 1), `limit`(default 20, max 50), `search`, `tag`

```json
{
  "posts": [{ "title": "...", "slug": "<16位hex>", "excerpt": "...", "tags": [], "author": "email", "published": true, "publishedAt": "...", "viewCount": 0, "likes": 0, "commentCount": 0 }],
  "total": 10, "page": 1, "totalPages": 1
}
```

## 用户文章列表

### GET /api/blog/users/:nickname/posts

```json
{ "posts": [...], "total": 5, "totalWords": 12345, "page": 1, "totalPages": 1 }
```

## 单篇文章

### GET /api/blog/posts/:slug

已登录作者可查看自己未发布的文章和草稿。

```json
{ "post": { "title": "...", "slug": "...", "content": "# markdown", "tags": [], "published": true, "publishedAt": "...", "viewCount": 5, "likes": 3, "commentCount": 2 } }
```

## 阅读计数

### POST /api/blog/posts/:slug/view

```json
{ "success": true }
```

## 点赞/取消

### POST /api/blog/posts/:slug/like
### DELETE /api/blog/posts/:slug/like

```json
{ "likes": 4 }
```

## 标签 & 统计

### GET /api/blog/tags
```json
{ "tags": [{ "name": "JavaScript", "count": 5 }] }
```

### GET /api/blog/stats
```json
{ "totalPosts": 10, "totalWords": 50000 }
```

## 评论

### GET /api/blog/posts/:slug/comments
**查询参数**: `page`, `limit`(default 50, max 100)

```json
{
  "comments": [{ "_id": "...", "author": "email", "content": "...", "createdAt": "...", "authorProfile": { "nickname": "用户", "avatarUrl": "/api/files/xxx" } }],
  "total": 3, "page": 1, "totalPages": 1
}
```

### POST /api/blog/posts/:slug/comments
需要认证。

```json
// Request
{ "content": "评论内容" }

// Response 201
{ "comment": { "_id": "...", "author": "email", "content": "...", "createdAt": "..." } }
```

## 管理操作 (需认证)

以下操作需要相应权限或为文章作者。

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/blog/posts/manage | `blog:write` | 列出当前用户所有文章 + 垃圾桶 |
| POST | /api/blog/posts | `blog:write` | 创建文章 `{ title, content, tags, published }` |
| PUT | /api/blog/posts/:slug | `blog:update` | 更新文章（需为作者） |
| PUT | /api/blog/posts/:slug/autosave | `blog:update` | 文章自动保存 |
| PUT | /api/blog/posts/:slug/trash | `blog:delete` | 移入垃圾桶 |
| PUT | /api/blog/posts/:slug/restore | `blog:update` | 恢复 |
| DELETE | /api/blog/posts/:slug | `blog:delete` | 永久删除（仅垃圾桶中的文章） |
| POST | /api/blog/import | `blog:write` | 批量导入 `{ "articles": [{ "title", "content", "tags", "published" }] }` |

## 文章标识

文章创建时生成 16 位随机 hex hash 作为 `slug`，编辑标题不会改变 slug。
