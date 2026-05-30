# 开发规约

本文收敛仓库级开发约束。项目结构总览见 [项目架构描述](architecture.md)；模块专属规则仍以 [auth-profile.instructions.md](../.github/instructions/auth-profile.instructions.md)、[blog-module.instructions.md](../.github/instructions/blog-module.instructions.md)、[chat-state.instructions.md](../.github/instructions/chat-state.instructions.md) 和 [chat-streaming.instructions.md](../.github/instructions/chat-streaming.instructions.md) 为准。

## 文档入口

- 架构总览： [doc/architecture.md](architecture.md)
- API 规范： [doc/apis/README.md](../doc/apis/README.md)、[doc/apis/API开发规范.md](../doc/apis/API开发规范.md)、[doc/apis/API文档格式.md](../doc/apis/API文档格式.md)
- UI 规范： [doc/ui/README.md](../doc/ui/README.md)、[doc/ui/frontend_design_tokens.md](../doc/ui/frontend_design_tokens.md)、[doc/ui/frontend_ui_style.md](../doc/ui/frontend_ui_style.md)
- 部署文档： [doc/部署说明.md](../doc/部署说明.md)

## 开发与验证

- 前端命令在 [frontend/package.json](../frontend/package.json) 所在目录执行，常用命令是 `npm install`、`npm run dev`、`npm run build`、`npm run preview`。
- 后端命令在 [backend/package.json](../backend/package.json) 所在目录执行，常用命令是 `npm install`、`npm start`、`npm run dev` 和 `npm run migrate:legacy-chats`。
- 仓库没有正式自动化测试套件；[backend/test.js](../backend/test.js) 只是手工 smoke 脚本。提交改动前优先做最窄范围的 build、联调或手工路径验证。
- 后端联调前先确认 MongoDB 可用；数据库连不上时服务会在启动阶段退出，`/health` 是最低成本的活性检查。
- 使用 Docker 或 Nginx 验证前，先构建 [frontend/dist](../frontend/dist)，因为静态站点根目录依赖该产物。
- 变更部署产物、目录布局或容器挂载时，要同步检查 [script/build.bat](../script/build.bat)、[script/build.ps1](../script/build.ps1)、[script/install.sh](../script/install.sh)、[script/deploy.sh](../script/deploy.sh) 和 [doc/部署说明.md](../doc/部署说明.md)。

## 目录边界与归属

- 活跃前端只在 [frontend](../frontend)；[frontend/chat](../frontend/chat) 是旧版实现，[frontend/home.bak](../frontend/home.bak) 是备份，不应继续作为当前功能开发入口。
- 后端按领域拆分路由：认证与资料在 [backend/src/routes/auth.js](../backend/src/routes/auth.js)，聊天在 [backend/src/routes/chat.js](../backend/src/routes/chat.js)，博客在 [backend/src/routes/blog.js](../backend/src/routes/blog.js)，上传在 [backend/src/routes/upload.js](../backend/src/routes/upload.js)，权限、统计、股市复盘和聊天管理各有独立路由文件。
- 修改功能时优先改它的 owning slice，不要把聊天、博客、认证或上传逻辑重新糅回同一文件。
- 公开 API、前端页面路由和后端路由形状有联动关系，改 URL、请求体或返回结构时要同步更新实现和文档。

## 后端与配置约束

- 后端使用 Node.js ESM，所有相对导入都必须保留 `.js` 扩展名。
- 模型配置权威入口是 [conf/backend/models.json](../conf/backend/models.json)，加载逻辑在 [backend/src/config/models.js](../backend/src/config/models.js)。新增模型或 Provider 时优先改配置，不要在代码里硬编码 provider 到环境变量的映射。
- API Key 等敏感信息必须通过环境变量或外部配置注入，禁止回退到硬编码密钥、默认管理员账号或启动时随机密钥。
- [conf/backend/identities](../conf/backend/identities) 只负责在启动时补齐缺失身份记录；运行时权威数据来自 MongoDB，修改种子文件不会回写已有数据库记录。
- 公开 API 规范和文档格式以 [doc/apis/API开发规范.md](../doc/apis/API开发规范.md) 和 [doc/apis/API文档格式.md](../doc/apis/API文档格式.md) 为准；对外接口变更时同步更新文档。

## 鉴权、身份与用户资料

- 鉴权是邮箱账号体系，token payload 中的身份字段是 `username`，后端通常通过 `req.user.username` 使用它。
- `CHAT_AUTH_SECRET` 必须来自运行时环境或密钥管理，不要重新引入默认值或弱回退。
- 注册流程是“两步式”：先验证码与待注册记录，再邮箱验证码确认后正式创建用户；同时 `register/request` 当前是先返回成功、再后台发送邮件。
- 公开博客主页和评论作者展示使用 `User.nickname`，但鉴权与归属判断仍基于邮箱对应的 `username`。修改昵称规则时要同时检查用户模型、认证路由、用户主页和评论组件。
- 昵称规则是中英文数字组合、长度 1 到 32、必须唯一，且保留字包括 `post`、`new`、`edit`、`manage`。
- guest 模式是纯前端状态；任何经过 `requireAuth` 的后端接口仍然需要 Bearer Token，不应在后端为 guest 单独开分支。

## Chat 与流式协议

- [frontend/src/pages/ChatPage.jsx](../frontend/src/pages/ChatPage.jsx) 同时承载两套状态源：登录用户通过后端 CRUD 持久化，guest 模式通过 localStorage 持久化。
- 除非明确做数据迁移，否则要保留 `auth_mode`、`guest_chat_records` 和 10 个 guest 会话上限这组现有约束。
- Chat 的 create、delete、select 和消息更新要在 guest 与登录态之间保持一致的标题、模型和消息同步行为。
- 登录态聊天更新在后端返回 404 时会通过“重建会话”恢复，这条 fallback 不能被静默移除。
- 变更聊天状态流后，至少回归“空白会话开始发送”和“已有会话继续发送”两条路径。
- 聊天流式输出必须继续使用 SSE：每帧 `data: <json>\n\n`，结束帧 `data: [DONE]\n\n`。
- 一旦流已经开始，后续错误也要继续用 SSE data 帧返回，而不是切回普通 JSON。
- Nginx 对 `/api` 的代理必须关闭 buffering，否则浏览器拿不到增量流。
- 聊天请求形状或流式载荷变化时，要把 [backend/src/services/provider.js](../backend/src/services/provider.js)、[backend/src/routes/chat.js](../backend/src/routes/chat.js)、[frontend/src/services/api.js](../frontend/src/services/api.js)、[conf/nginx/nginx.conf](../conf/nginx/nginx.conf) 和 [doc/apis/chat.md](../doc/apis/chat.md) 一起更新。

## Blog 约束

- 前端博客路由、[frontend/src/services/blogApi.js](../frontend/src/services/blogApi.js) 和 [backend/src/routes/blog.js](../backend/src/routes/blog.js) 要保持一致，当前公开路由是 `/blog`、`/blog/:nickname`、`/blog/post/:slug`、`/blog/new`、`/blog/edit/:slug`、`/blog/manage`。
- 博客 slug 由后端生成随机 hash，不是标题派生值；编辑文章时不能把标题修改自动映射成 slug 变更。
- 已发布与已删除是两套状态：公开列表只显示已发布且未进垃圾桶的文章，垃圾桶中的文章在永久删除前应保持可恢复。
- 文章详情页允许作者通过可选鉴权查看自己的未发布内容；调整可见性时不要破坏这条 unpublished fallback。
- 点赞是匿名计数器，前端仅通过 localStorage 做去重，不是服务端的“用户点赞关系”。
- 评论创建需要登录，并且会联动更新文章评论数；评论接口的响应形状或分页逻辑变化时要同步前后端。

## 上传与文件处理

- 头像上传链路横跨 [frontend/src/components/AvatarUpload.jsx](../frontend/src/components/AvatarUpload.jsx) 和 [backend/src/routes/upload.js](../backend/src/routes/upload.js)，修改时要两端一起看。
- 客户端与服务端都会验证上传文件类型和大小；服务端还会做图片缩放。
- 文件存储路径有平台差异：容器环境通常是 `/app/files`，Windows 开发环境是 `%APPDATA%/xntech/images/`。
- 文件通过 `GET /api/files/:id` 提供访问，并带有长期缓存语义。

## 前端共享实现约定

- 所有面向用户的字符串统一走 [frontend/src/contexts/AppShellContext.jsx](../frontend/src/contexts/AppShellContext.jsx) 暴露的 `t()`，不要在组件里直接硬编码新文案。
- 当前支持语言是 `zh-CN`、`zh-TW`、`en-US`，locale 持久化键是 `app_locale`。
- 颜色、表面和状态色优先使用 CSS 变量，不要在组件里随意写十六进制颜色。
- 带 `backdrop-blur` 的头部会形成新的 containing block；任何 `position: fixed` 的弹窗或面板都应渲染在头部之外，避免被裁切。
- 认证相关页面和组件优先通过 [frontend/src/contexts/AuthContext.jsx](../frontend/src/contexts/AuthContext.jsx) 复用会话与资料状态，而不是重复写一套登录态监听与资料请求。
- 新增或重构服务层时，优先复用 [frontend/src/services/httpClient.js](../frontend/src/services/httpClient.js) 和 [frontend/src/services/authStorage.js](../frontend/src/services/authStorage.js)，避免再次复制 token/header/error 处理。
- 博客风格页面优先复用 [frontend/src/components/layout/BlogPageLayout.jsx](../frontend/src/components/layout/BlogPageLayout.jsx)，管理类页面优先复用 [frontend/src/components/layout/ManagementPageLayout.jsx](../frontend/src/components/layout/ManagementPageLayout.jsx)。

## 部署与运行协同

- 生产聊天页面挂在 `/chat/`，调整 base path 或代理路径时，要同时检查 [frontend/vite.config.js](../frontend/vite.config.js)、[conf/nginx/nginx.conf](../conf/nginx/nginx.conf)、[conf/nginx/conf.d/chat.location](../conf/nginx/conf.d/chat.location) 和 [conf/nginx/conf.d/xn.location](../conf/nginx/conf.d/xn.location)。
- Nginx、Compose、前端产物目录和运行时配置目录必须保持一致，否则本地开发能跑并不代表容器环境可用。

