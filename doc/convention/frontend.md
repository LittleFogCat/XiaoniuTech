# 前端共享实现约定

- 所有面向用户的字符串统一走 [frontend/src/contexts/AppShellContext.jsx](../../frontend/src/contexts/AppShellContext.jsx) 暴露的 `t()`，不要在组件里直接硬编码新文案。
- 当前支持语言是 `zh-CN`、`zh-TW`、`en-US`，locale 持久化键是 `app_locale`。
- 颜色、表面和状态色优先使用 CSS 变量，不要在组件里随意写十六进制颜色。
- 带 `backdrop-blur` 的头部会形成新的 containing block；任何 `position: fixed` 的弹窗或面板都应渲染在头部之外，避免被裁切。
- 认证相关页面和组件优先通过 [frontend/src/contexts/AuthContext.jsx](../../frontend/src/contexts/AuthContext.jsx) 复用会话与资料状态，而不是重复写一套登录态监听与资料请求。
- 新增或重构服务层时，优先复用 [frontend/src/services/httpClient.js](../../frontend/src/services/httpClient.js) 和 [frontend/src/services/authStorage.js](../../frontend/src/services/authStorage.js)，避免再次复制 token/header/error 处理。
- 博客风格页面优先复用 [frontend/src/components/layout/BlogPageLayout.jsx](../../frontend/src/components/layout/BlogPageLayout.jsx)，管理类页面优先复用 [frontend/src/components/layout/ManagementPageLayout.jsx](../../frontend/src/components/layout/ManagementPageLayout.jsx)。
