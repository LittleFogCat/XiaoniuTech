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

- Auth routes live in [backend/src/routes/auth.js](../../backend/src/routes/auth.js), while protected-route enforcement lives in [backend/src/middleware/auth.js](../../backend/src/middleware/auth.js). Keep login and registration concerns out of [backend/src/routes/chat.js](../../backend/src/routes/chat.js).
- `CHAT_AUTH_SECRET` is required runtime configuration for token signing. Do not add hardcoded fallback secrets, boot-time random secrets, or default admin credentials back into [backend/src/services/auth.js](../../backend/src/services/auth.js).
- Tokens currently store the email-backed account identity in `payload.username`, and middleware exposes it as `req.user.username`. If the payload shape changes, update all token readers together, including [frontend/src/services/blogApi.js](../../frontend/src/services/blogApi.js).
- Registration is a two-step flow: captcha validation plus pending-registration persistence in [backend/src/models/PendingRegistration.js](../../backend/src/models/PendingRegistration.js), then email-code verification before user creation. Preserve that write-then-verify sequence when changing signup behavior.
- `register/request` currently returns success before background email sending finishes. If you change that contract, review the UX and retry behavior in [frontend/src/components/Login.jsx](../../frontend/src/components/Login.jsx) and the SMTP integration in [backend/src/services/mail.js](../../backend/src/services/mail.js).
- `User.nickname` drives public blog profile URLs and must stay aligned with the validation and reserved-name checks in [backend/src/routes/auth.js](../../backend/src/routes/auth.js). Any nickname rule change should also review [frontend/src/pages/SettingsPage.jsx](../../frontend/src/pages/SettingsPage.jsx), [frontend/src/pages/UserHomePage.jsx](../../frontend/src/pages/UserHomePage.jsx), and [frontend/src/components/BlogComment.jsx](../../frontend/src/components/BlogComment.jsx).
- Avatar updates flow through [frontend/src/components/AvatarUpload.jsx](../../frontend/src/components/AvatarUpload.jsx) to [backend/src/routes/upload.js](../../backend/src/routes/upload.js), then are persisted back onto the user profile. Client and server both validate file type and size; change both ends together.
- Guest access is frontend-only state. Any backend endpoint guarded by `requireAuth` still needs a bearer token and should not special-case guest mode.