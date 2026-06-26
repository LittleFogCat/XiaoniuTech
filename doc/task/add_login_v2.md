## 任务目标

在现有登录体系基础上，新增一套支持 Token 刷新的 v2 登录接口。
不改动、不删除现有的 /api/login 接口及其相关代码，保持完全兼容。

---

## 现有项目背景

- 后端框架：Express
- 数据库：MongoDB（使用 Mongoose）
- 现有登录接口：POST /api/login
  - 请求参数：email（或 username）、password
  - 返回：{ success, token, user }
  - token 为单一 JWT，有效期 7 天（可通过环境变量 CHAT_AUTH_TOKEN_TTL_MS 覆盖）

---

## 需要新增的内容

### 1. MongoDB Model：RefreshToken

新建 RefreshToken 的 Mongoose Model，字段如下：

- userId：ObjectId，关联 User
- token：String，唯一索引，crypto.randomBytes(40).toString('hex') 生成
- deviceId：String，客户端传入的设备唯一标识
- deviceName：String，设备名称（如 "iPhone 15"）
- expiresAt：Date，TTL 索引（expireAfterSeconds: 0），30 天后自动过期
- lastUsedAt：Date
- createdAt：Date

### 2. 新接口：POST /api/login-v2

请求参数（JSON Body）：
- email：string，必需
- password：string，必需
- deviceId：string，必需，客户端生成的设备唯一 ID
- deviceName：string，可选，设备描述

返回格式：
{
  "success": true,
  "accessToken": "<JWT>",       // 有效期 2 小时
  "refreshToken": "<随机串>",   // 有效期 30 天，滑动续期
  "expiresIn": 7200,
  "user": {
    "username": "...",
    "email": "..."
  }
}

逻辑：
1. 验证 email + password（复用现有用户验证逻辑）
2. 生成 accessToken（JWT，sub 为 userId，有效期 2 小时）
3. 生成 refreshToken，写入 RefreshToken 集合
4. 返回上述响应

### 3. 新接口：POST /api/refresh

请求参数（JSON Body）：
- refreshToken：string，必需
- deviceId：string，必需

逻辑：
1. 查找 RefreshToken 记录（token + deviceId 匹配）
2. 若不存在或已过期，返回 401，body: { code: "invalid_token" }
3. 删除旧 RefreshToken 记录（Token Rotation，防止重放攻击）
4. 生成新 accessToken + 新 refreshToken（expiresAt 重置为当前时间 + 30 天，即滑动续期）
5. 返回：
{
  "accessToken": "<新JWT>",
  "refreshToken": "<新随机串>",
  "expiresIn": 7200
}

### 4. 新接口：POST /api/logout-v2

请求头：Authorization: Bearer <accessToken>
请求参数（JSON Body）：
- refreshToken：string，必需

逻辑：
1. 验证 accessToken（使用现有 auth 中间件，或新建同逻辑中间件）
2. 删除对应 RefreshToken 记录
3. 返回：{ "success": true, "message": "已登出" }

### 5. 新建 auth-v2 中间件

新建一个独立中间件文件（不修改现有 auth 中间件），用于保护 v2 接口：
- 从 Authorization: Bearer <token> 中提取 JWT
- 验证签名和有效期
- 过期时返回 401，body: { code: "token_expired" }
- 验证通过时将 userId 挂载到 req.userId

---

## 代码规范要求

- 复用现有项目中已有的用户密码验证逻辑，不要重复实现
- JWT secret 统一从环境变量读取（复用现有项目已使用的变量名）
- 新增代码放在与现有 auth 相关文件平级的位置，文件名加 -v2 后缀区分
- 不修改、不删除任何现有文件，只新增
- 完成后输出变更文件清单，以及需要补充到 .env 的新环境变量（如有）

---

## 完成后输出

1. 所有新增文件的完整代码
2. 需要在主路由文件（app.js 或 routes/index.js 等）中新增的路由注册代码片段
3. 更新后的接口文档（Markdown 格式），仅包含新增的三个接口

## Review 结果

 1. Code duplication in authV2.js (lines 7-31)

The functions getAuthSecret, base64urlEncode, base64urlDecode, and signPayload are identical copies from services/auth.js. These should be imported from auth.js instead:

// Instead of redefining, import from the existing module:
import { /* these aren't exported currently */ } from './auth.js';

If they're not exported from auth.js today, the fix is to export them there and import in authV2.js. Duplicating crypto-sensitive code is a maintenance risk — a future fix to timing safety or encoding in one
place won't reach the other.

2. Refresh endpoint doesn't check blacklist status

routes/authV2.js:120 — the refresh route calls User.findById(record.userId).lean() directly, bypassing the permission store. A blacklisted user can keep refreshing tokens indefinitely. The access token from
the refresh will be caught by the middleware on the next API call, but it's still a window where the blacklisted user holds a valid access token for up to 2 hours.

Fix: use getUserAccessById (from permissionStore.js) and check access.isBlacklisted, consistent with the middleware.

3. issueSession swallows deviceId trimming internally, but the caller also trims

routes/authV2.js:85 does const trimmedDeviceId = deviceId.trim() before passing to issueSession. Then issueSession at line 46 does deviceId.trim() again. Harmless, but redundant. Pick one place.

4. Missing .catch on login cleanup vs. refresh cleanup inconsistency

login-v2 route line 86 does await RefreshToken.deleteMany(...) without .catch(), so a DB error here becomes a 500. The refresh route consistently uses .catch(() => {}) for cleanup deletes. The login behavior
is arguably more correct (fail loudly), but the inconsistency is worth noting.

5. user.username field semantics differ from v1

The original login returns { user: { username: identity, email } } where username is the email. The v2 version returns { user: { username: user.nickname || user.email, email } }. This is a benign change, but
frontend consumers expecting username === email might need updating.