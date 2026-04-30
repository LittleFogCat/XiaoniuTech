# User 模块接口

> 用户模块接口文档（暂未实现）

---

## 用户注册

### POST /api/auth/register

**请求体**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

---

## 用户登录

### POST /api/auth/login

**请求体**
```json
{
  "email": "string",
  "password": "string"
}
```

---

## 获取当前用户信息

### GET /api/auth/me

需要携带 JWT Token