---
description: "Use when changing login, registration, token signing, user profile, avatar upload, or email verification flows."
name: "Auth And Profile Contract"
applyTo:
  - "backend/src/routes/auth.js"
  - "backend/src/middleware/auth.js"
  - "backend/src/services/auth.js"
  - "backend/src/services/mail.js"
  - "backend/src/routes/upload.js"
  - "backend/src/models/User.js"
  - "frontend/src/components/Login.jsx"
  - "frontend/src/pages/LoginPage.jsx"
  - "frontend/src/pages/SettingsPage.jsx"
  - "frontend/src/components/AvatarUpload.jsx"
  - "frontend/src/services/api.js"
  - "frontend/src/services/blogApi.js"
---

# Auth And Profile Contract

- 通用鉴权、guest 模式、昵称规则和安全约束已收敛到 [doc/convention/README.md](../../doc/convention/README.md)。本文件只保留认证/资料流自身的模块契约。
- Auth routes live in [backend/src/routes/auth.js](../../backend/src/routes/auth.js), while protected-route enforcement lives in [backend/src/middleware/auth.js](../../backend/src/middleware/auth.js). Keep login and registration concerns out of [backend/src/routes/chat.js](../../backend/src/routes/chat.js).
- Registration is a two-step flow: captcha validation plus pending-registration persistence in [backend/src/models/PendingRegistration.js](../../backend/src/models/PendingRegistration.js), then email-code verification before user creation. Preserve that write-then-verify sequence when changing signup behavior.
- `register/request` currently returns success before background email sending finishes. If you change that contract, review the UX and retry behavior in [frontend/src/components/Login.jsx](../../frontend/src/components/Login.jsx) and the SMTP integration in [backend/src/services/mail.js](../../backend/src/services/mail.js).
- Avatar updates flow through [frontend/src/components/AvatarUpload.jsx](../../frontend/src/components/AvatarUpload.jsx) to [backend/src/routes/upload.js](../../backend/src/routes/upload.js), then are persisted back onto the user profile. Client and server both validate file type and size; change both ends together.
