# Auth 模块

所有路径前缀 `/api`。

## 获取人机验证

### GET /api/register/captcha

```json
{
  "challengeId": "abc123",
  "question": "3 + 5 = ?"
}
```

## 发送注册验证码

### POST /api/register/request

```json
// Request
{ "email": "user@example.com", "password": "12345678", "captchaId": "abc123", "captchaAnswer": "8" }

// Response 200
{ "success": true, "email": "user@example.com", "expiresInMs": 600000, "retryAfterSeconds": 60, "remainingThisHour": 4 }

// Response 400 — 人机验证失败
// Response 409 — 邮箱已注册
// Response 429 — 频率限制（IP 5次/小时 或 1次/分钟）
```

验证码邮件在后台异步发送，不阻塞响应。

## 完成注册验证

### POST /api/register/verify

```json
// Request
{ "email": "user@example.com", "code": "123456" }

// Response 200
{ "success": true, "token": "<jwt>", "user": { "username": "user@example.com", "email": "user@example.com" } }
```

昵称初始化为邮箱地址。

## 登录

### POST /api/login

```json
// Request
{ "email": "user@example.com", "password": "12345678" }

// Response 200
{ "success": true, "token": "<jwt>", "user": { "username": "user@example.com", "email": "user@example.com" } }

// Response 401 — 邮箱或密码错误
```

Token 为 HMAC-SHA256 签名，格式 `base64url(payload).base64url(signature)`，有效期 7 天。

## 获取当前用户信息

### GET /api/user/profile

需要认证。返回用户信息和权限。

```json
{
  "user": {
    "email": "user@example.com",
    "nickname": "User",
    "avatarUrl": "/api/files/xxx",
    "avatarFileId": "...",
    "bio": "简介",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "groups": ["默认用户组"],
    "permissions": ["blog:write", "blog:read", "chat:chat_free"]
  }
}
```

## 更新用户信息

### PUT /api/user/profile

需要认证。所有字段可选。

```json
// Request
{
  "nickname": "新昵称",
  "bio": "简介",
  "avatarFileId": "文件ID 或 null",
  "currentPassword": "旧密码",
  "newPassword": "新密码"
}

// Response 200
{ "user": { ... } }

// Response 400 — nickname 非法 / 密码错误 / 头像文件无效
// Response 409 — nickname 重复
```

修改密码需同时提供 `currentPassword` 和 `newPassword`。
昵称限制：1-32字符、仅字母/数字/中文、不可使用保留词（post/new/edit/manage）、不可重复。

## 获取用户公开信息

### GET /api/users/:nickname

不要求认证。

```json
{
  "user": {
    "nickname": "XiaoNiu",
    "bio": "全栈开发者",
    "avatarUrl": "/api/files/xxx"
  }
}
```
