# 文件接口

所有接口路径前缀均为 `/api`。

### 上传图片文件

**接口描述**

上传单张图片并保存为文件记录，常用于头像和博客图片。接口使用去重存储，已存在同内容文件时会复用已有记录。

**请求路径**

`POST /api/upload`

**路径参数**

无。

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| file | file | 是 | `multipart/form-data` 单文件字段，字段名固定为 `file`。仅支持 `image/jpeg`、`image/png`、`image/gif`、`image/webp`。 |

**请求示例**

请求头示例：`Content-Type: multipart/form-data`

**返回示例**

```json
{
  "file": {
    "id": "68207a7105d9d5a1bc3aa7a5",
    "filename": "a1b2c3d4e5f6a7b8.jpg",
    "originalName": "photo.jpg",
    "size": 45678,
    "mimetype": "image/jpeg",
    "md5": "e2fc714c4727ee9395f324cd2e7f331f",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| file | object | 是 | 文件对象。 |
| file.id | string | 是 | 文件记录 ID，例如 `68207a7105d9d5a1bc3aa7a5`。 |
| file.filename | string | 是 | 保存后的文件名，例如 `a1b2c3d4e5f6a7b8.jpg`。 |
| file.originalName | string | 是 | 上传时的原始文件名，例如 `photo.jpg`。 |
| file.size | number | 是 | 保存后文件大小，单位字节。 |
| file.mimetype | string | 是 | 文件 MIME 类型，例如 `image/jpeg`。 |
| file.md5 | string | 是 | 文件内容 MD5，用于去重。 |
| file.createdAt | string | 是 | 文件记录创建时间，ISO 字符串。 |

**所需权限**

需要登录。

**其他说明**

- 文件大小上限为 `5MB`。
- 图片长边超过 `1024px` 时会自动缩放。
- 首次写入新文件时返回 `201`，命中去重复用已有文件时返回 `200`。
- 可能返回的错误状态码：`400`（未选择文件或文件类型不支持）、`401`、`403`。

### 访问文件

**接口描述**

按文件 ID 返回二进制文件内容。

**请求路径**

`GET /api/files/:id`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 是 | 文件记录 ID，例如 `68207a7105d9d5a1bc3aa7a5`。 |

**请求参数**

无。

**返回示例**

此接口直接返回文件二进制流，不返回 JSON。

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| 响应体 | binary | 是 | 文件二进制内容。响应头 `Content-Type` 取自文件记录中的 `mimetype`。 |

**所需权限**

无需登录。

**其他说明**

- 响应头包含 `Cache-Control: public, max-age=31536000, immutable`。
- 可能返回的错误状态码：`404`（文件不存在或磁盘文件已被删除）。
