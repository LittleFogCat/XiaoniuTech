# 上传与文件处理

- 头像上传链路横跨 [frontend/src/components/AvatarUpload.jsx](../../frontend/src/components/AvatarUpload.jsx) 和 [backend/src/routes/upload.js](../../backend/src/routes/upload.js)，修改时要两端一起看。
- 客户端与服务端都会验证上传文件类型和大小；服务端还会做图片缩放。
- 文件存储路径有平台差异：容器环境通常是 `/app/files`，Windows 开发环境是 `%APPDATA%/xntech/images/`。
- 文件通过 `GET /api/files/:id` 提供访问，并带有长期缓存语义。
