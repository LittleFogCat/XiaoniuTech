# 项目架构描述

本文收敛仓库级架构信息。开发约束见 [开发规约](convention.md)，模块级契约见 [auth-profile.instructions.md](../.github/instructions/auth-profile.instructions.md)、[blog-module.instructions.md](../.github/instructions/blog-module.instructions.md)、[chat-state.instructions.md](../.github/instructions/chat-state.instructions.md) 和 [chat-streaming.instructions.md](../.github/instructions/chat-streaming.instructions.md)。

## 项目概览

- XiaoNiu Tech 是一个统一仓库的个人站点，包含 AI Chat、Blog、用户与权限管理、统计和股市复盘能力。
- 活跃前端在 [frontend](../frontend)，活跃后端在 [backend](../backend)，部署配置集中在 [conf](../conf)，文档集中在 [doc](../doc)。
- 唯一部署产物目录是 [frontend/dist](../frontend/dist)。[frontend/chat](../frontend/chat) 是旧版聊天前端，[frontend/home.bak](../frontend/home.bak) 是备份内容，不作为当前产品代码继续扩展。

## 技术栈

### 前端

- 基础框架：React 18、React DOM、React Router，入口在 [frontend/src/main.jsx](../frontend/src/main.jsx) 和 [frontend/src/App.jsx](../frontend/src/App.jsx)。
- 构建工具：Vite，脚本定义见 [frontend/package.json](../frontend/package.json)。
- 样式体系：Tailwind CSS + PostCSS + Autoprefixer，设计变量和样式规范见 [doc/ui/README.md](../doc/ui/README.md)、[doc/ui/frontend_design_tokens.md](../doc/ui/frontend_design_tokens.md)、[doc/ui/frontend_ui_style.md](../doc/ui/frontend_ui_style.md)。
- 交互与内容：Radix UI Select/ScrollArea、React Markdown、remark-gfm。

### 后端

- 运行时：Node.js ESM，入口在 [backend/src/index.js](../backend/src/index.js)。
- Web 框架：Express。
- 数据层：MongoDB + Mongoose。
- 基础能力：Multer 处理上传、Sharp 处理图片、Nodemailer 处理邮件、UUID 生成标识。
- 启动和维护脚本定义见 [backend/package.json](../backend/package.json)。

### 运行与部署

- 反向代理与静态托管：Nginx，主配置在 [conf/nginx/nginx.conf](../conf/nginx/nginx.conf)。
- 容器编排：Docker Compose，入口在 [conf/compose/docker-compose.yml](../conf/compose/docker-compose.yml)。
- 运行时配置与种子数据：集中在 [conf/backend](../conf/backend)。

## 目录与边界

- [frontend](../frontend)：统一 SPA，承载首页、聊天、博客、设置、权限管理、统计和股市复盘页面。
- [backend](../backend)：Express API 服务，所有业务入口最终由 [backend/src/index.js](../backend/src/index.js) 挂载。
- [conf](../conf)：Docker、Nginx、模型配置和身份种子等部署/运行时配置。
- [script](../script)：打包与部署脚本。
- [doc](../doc)：API、UI、部署和任务规划文档。

## 前端架构

### 入口与路由

- 根入口由 [frontend/src/App.jsx](../frontend/src/App.jsx) 组织，当前主要路由包括首页、聊天、登录、博客列表/详情/编辑/管理、用户主页、设置、权限管理、统计和股市复盘。
- 全局 Provider 顺序是 `AppShellProvider -> AuthProvider -> BrowserRouter`，由此统一主题、语言、鉴权态和路由树。

### 共享状态与上下文

- [frontend/src/contexts/AppShellContext.jsx](../frontend/src/contexts/AppShellContext.jsx)：提供国际化 `t()`、主题切换、语言切换和日期/数字格式化。
- [frontend/src/contexts/AuthContext.jsx](../frontend/src/contexts/AuthContext.jsx)：提供登录态、guest 模式、用户资料、登出和资料刷新能力。

### 服务层

- [frontend/src/services/httpClient.js](../frontend/src/services/httpClient.js)：统一请求、鉴权头、JSON 解析和错误包装。
- [frontend/src/services/authStorage.js](../frontend/src/services/authStorage.js)：统一 token、auth_mode、登录态标记和鉴权事件广播。
- [frontend/src/services/api.js](../frontend/src/services/api.js)：聊天与认证相关 API，包括聊天流式读取。
- [frontend/src/services/blogApi.js](../frontend/src/services/blogApi.js)：博客、评论、用户资料与点赞 API。
- [frontend/src/services/adminApi.js](../frontend/src/services/adminApi.js)：权限、黑名单、聊天管理、统计 API。
- [frontend/src/services/stockApi.js](../frontend/src/services/stockApi.js)：股市复盘 API。

### 通用组件与页面壳

- 页面壳： [frontend/src/components/layout/BlogPageLayout.jsx](../frontend/src/components/layout/BlogPageLayout.jsx) 用于博客风格页面，[frontend/src/components/layout/ManagementPageLayout.jsx](../frontend/src/components/layout/ManagementPageLayout.jsx) 用于后台/管理类页面。
- 全局导航与账户组件： [frontend/src/components/BlogHeader.jsx](../frontend/src/components/BlogHeader.jsx)、[frontend/src/components/UserAccountMenu.jsx](../frontend/src/components/UserAccountMenu.jsx)、[frontend/src/components/LanguageThemeControls.jsx](../frontend/src/components/LanguageThemeControls.jsx)、[frontend/src/components/BackHomeButton.jsx](../frontend/src/components/BackHomeButton.jsx)。
- 聊天组件： [frontend/src/components/ChatInput.jsx](../frontend/src/components/ChatInput.jsx)、[frontend/src/components/ChatMessage.jsx](../frontend/src/components/ChatMessage.jsx)、[frontend/src/components/ModelSelect.jsx](../frontend/src/components/ModelSelect.jsx)、[frontend/src/components/IdentityPicker.jsx](../frontend/src/components/IdentityPicker.jsx)、[frontend/src/components/Sidebar.jsx](../frontend/src/components/Sidebar.jsx)。
- 内容与资料组件： [frontend/src/components/MarkdownEditor.jsx](../frontend/src/components/MarkdownEditor.jsx)、[frontend/src/components/AvatarUpload.jsx](../frontend/src/components/AvatarUpload.jsx)、[frontend/src/components/BlogComment.jsx](../frontend/src/components/BlogComment.jsx)。
- 全局埋点组件： [frontend/src/components/StatisticsTracker.jsx](../frontend/src/components/StatisticsTracker.jsx)。

### 页面分组

- 首页与占位页： [frontend/src/pages/HomePage.jsx](../frontend/src/pages/HomePage.jsx)、[frontend/src/pages/PlaceholderPage.jsx](../frontend/src/pages/PlaceholderPage.jsx)。
- 聊天： [frontend/src/pages/ChatPage.jsx](../frontend/src/pages/ChatPage.jsx)、[frontend/src/pages/ChatManagePage.jsx](../frontend/src/pages/ChatManagePage.jsx)。
- 博客： [frontend/src/pages/BlogListPage.jsx](../frontend/src/pages/BlogListPage.jsx)、[frontend/src/pages/BlogPostPage.jsx](../frontend/src/pages/BlogPostPage.jsx)、[frontend/src/pages/BlogEditorPage.jsx](../frontend/src/pages/BlogEditorPage.jsx)、[frontend/src/pages/BlogManagePage.jsx](../frontend/src/pages/BlogManagePage.jsx)、[frontend/src/pages/UserHomePage.jsx](../frontend/src/pages/UserHomePage.jsx)。
- 账户与管理： [frontend/src/pages/LoginPage.jsx](../frontend/src/pages/LoginPage.jsx)、[frontend/src/pages/SettingsPage.jsx](../frontend/src/pages/SettingsPage.jsx)、[frontend/src/pages/PermissionManagePage.jsx](../frontend/src/pages/PermissionManagePage.jsx)、[frontend/src/pages/StatisticsPage.jsx](../frontend/src/pages/StatisticsPage.jsx)。
- 股市复盘： [frontend/src/pages/StockReviewPage.jsx](../frontend/src/pages/StockReviewPage.jsx)、[frontend/src/pages/StockReviewDetailPage.jsx](../frontend/src/pages/StockReviewDetailPage.jsx)。

## 后端架构

### 入口与中间件

- [backend/src/index.js](../backend/src/index.js) 负责创建 Express 应用、连接 MongoDB、挂载路由，并在启动阶段初始化权限、模型、智能体、身份目录和股市复盘索引。
- 全局请求会先通过 [backend/src/middleware/auth.js](../backend/src/middleware/auth.js) 的用户解析逻辑，对黑名单用户进行前置拦截。
- 健康检查入口是 `/health`。

### 路由切片

- 认证与用户资料： [backend/src/routes/auth.js](../backend/src/routes/auth.js)
- 聊天与流式输出： [backend/src/routes/chat.js](../backend/src/routes/chat.js)
- 聊天模型/智能体管理： [backend/src/routes/chatManage.js](../backend/src/routes/chatManage.js)
- 博客： [backend/src/routes/blog.js](../backend/src/routes/blog.js)
- 股市复盘： [backend/src/routes/stock.js](../backend/src/routes/stock.js)
- 权限与黑名单： [backend/src/routes/permission.js](../backend/src/routes/permission.js)
- 统计： [backend/src/routes/statistics.js](../backend/src/routes/statistics.js)
- 上传与文件访问： [backend/src/routes/upload.js](../backend/src/routes/upload.js)
- SEO 输出： [backend/src/routes/seo.js](../backend/src/routes/seo.js)

### 服务层

- 认证与邮件： [backend/src/services/auth.js](../backend/src/services/auth.js)、[backend/src/services/mail.js](../backend/src/services/mail.js)
- 聊天与模型： [backend/src/services/provider.js](../backend/src/services/provider.js)、[backend/src/services/chatStore.js](../backend/src/services/chatStore.js)、[backend/src/services/modelStore.js](../backend/src/services/modelStore.js)、[backend/src/services/agentStore.js](../backend/src/services/agentStore.js)、[backend/src/services/identityStore.js](../backend/src/services/identityStore.js)
- 博客： [backend/src/services/blogStore.js](../backend/src/services/blogStore.js)
- 权限与统计： [backend/src/services/permissionStore.js](../backend/src/services/permissionStore.js)、[backend/src/services/statisticsStore.js](../backend/src/services/statisticsStore.js)
- 文件与引用： [backend/src/services/fileStore.js](../backend/src/services/fileStore.js)、[backend/src/services/fileReferenceStore.js](../backend/src/services/fileReferenceStore.js)
- 股市复盘： [backend/src/services/stockStore.js](../backend/src/services/stockStore.js)

### 数据模型

- 用户与权限： [backend/src/models/User.js](../backend/src/models/User.js)、[backend/src/models/UserGroup.js](../backend/src/models/UserGroup.js)、[backend/src/models/Blacklist.js](../backend/src/models/Blacklist.js)
- 认证相关： [backend/src/models/PendingRegistration.js](../backend/src/models/PendingRegistration.js)
- 聊天与智能体： [backend/src/models/Chat.js](../backend/src/models/Chat.js)、[backend/src/models/ChatModel.js](../backend/src/models/ChatModel.js)、[backend/src/models/Agent.js](../backend/src/models/Agent.js)、[backend/src/models/Identity.js](../backend/src/models/Identity.js)
- 博客： [backend/src/models/BlogPost.js](../backend/src/models/BlogPost.js)、[backend/src/models/BlogComment.js](../backend/src/models/BlogComment.js)
- 文件： [backend/src/models/File.js](../backend/src/models/File.js)、[backend/src/models/FileReference.js](../backend/src/models/FileReference.js)
- 统计与业务扩展： [backend/src/models/VisitStatistic.js](../backend/src/models/VisitStatistic.js)、[backend/src/models/StockReview.js](../backend/src/models/StockReview.js)

## 运行时配置与部署结构

- 模型配置入口是 [conf/backend/models.json](../conf/backend/models.json)，由 [backend/src/config/models.js](../backend/src/config/models.js) 解析并支持环境变量占位符。
- 身份种子在 [conf/backend/identities](../conf/backend/identities)，只在启动时补齐缺失记录，运行时权威数据来自 MongoDB。
- Nginx 负责 `/api` 代理和前端静态资源托管；聊天流式场景依赖关闭代理缓冲。
- 本地和生产部署脚本集中在 [script/build.bat](../script/build.bat)、[script/build.ps1](../script/build.ps1)、[script/install.sh](../script/install.sh) 和 [script/deploy.sh](../script/deploy.sh)。

## 配套文档

- 通用开发约束见 [开发规约](convention.md)。
- API 文档入口见 [doc/apis/README.md](../doc/apis/README.md)。
- UI 规范入口见 [doc/ui/README.md](../doc/ui/README.md)。
- 部署说明见 [doc/部署说明.md](../doc/部署说明.md)。