# File 模块

所有路径前缀 `/api`。

## 上传文件

### POST /api/upload

需要认证。`Content-Type: multipart/form-data`，单文件字段名 `file`。

- 允许类型: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- 大小上限: 5MB
- 长边超过 1024px 自动缩放
- 文件名: SHA-256 hash (16 hex) + 原扩展名
- 存储路径: Linux `/app/files/`, Windows `{APPDATA}/xntech/images/`

```json
// Response 201
{
  "file": {
    "id": "文件ObjectId",
    "filename": "a1b2c3d4.jpg",
    "originalName": "photo.jpg",
    "size": 45678,
    "mimetype": "image/jpeg",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

## 访问文件

### GET /api/files/:id

响应文件二进制流，`Cache-Control: public, max-age=31536000, immutable`。
