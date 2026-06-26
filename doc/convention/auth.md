# 鉴权、身份与用户资料

- 鉴权是邮箱账号体系，token payload 中的身份字段是 `username`，后端通常通过 `req.user.username` 使用它。
- `CHAT_AUTH_SECRET` 必须来自运行时环境或密钥管理，不要重新引入默认值或弱回退。
- 注册流程是"两步式"：先验证码与待注册记录，再邮箱验证码确认后正式创建用户；同时 `register/request` 当前是先返回成功、再后台发送邮件。
- 公开博客主页和评论作者展示使用 `User.nickname`，但鉴权与归属判断仍基于邮箱对应的 `username`。修改昵称规则时要同时检查用户模型、认证路由、用户主页和评论组件。
- 昵称规则是中英文数字组合、长度 1 到 32、必须唯一，且保留字包括 `post`、`new`、`edit`、`manage`。
- guest 模式是纯前端状态；任何经过 `requireAuth` 的后端接口仍然需要 Bearer Token，不应在后端为 guest 单独开分支。
