# SEO 开发规范

## 适用范围

- 所有新页面都必须在页面组件顶部调用统一的 `usePageSeo` hook。
- 公共内容页必须提供独立的 `title`、`description`、`canonical` 和 Open Graph 信息。
- 内部功能页、后台页、登录页、聊天页、统计页默认添加 `noindex, nofollow`。

## Meta 模板

### 首页

- `title`: `首页 - XiaoNiu Tech`
- `description`: 首页主文案，120 字以内
- `canonical`: `/`
- `og:*`: 与页面标题、描述一致，图片默认使用 `/image/niu.jpg`
- 结构化数据：`WebSite`

### 博客文章页

- `title`: `文章标题 - XN Blog`
- `description`: 优先使用文章摘要，其次从正文提取 120 字以内纯文本
- `canonical`: `/blog/post/:slug`
- `og:type`: `article`
- 结构化数据：`Article`

### 博客列表 / 作者页

- `title`: `作者昵称 - XN Blog` 或博客列表页标题
- `description`: 作者简介或文章列表简介
- `canonical`: `/blog` 或 `/blog/:nickname`

### 功能页 / 后台页

- 例如：登录页、设置页、聊天页、聊天管理、权限管理、访问统计
- 必须设置独立 `title` 和 `description`
- 必须设置 `robots: noindex, nofollow`

## noindex 规则

以下页面默认不参与搜索引擎索引：

- `/chat` 及其子页面
- `/statistics` 及其子页面
- `/login`
- `/settings`
- `/blog/new`
- `/blog/edit/*`
- `/blog/manage`
- 其他仅面向登录用户或后台管理的页面

## 结构化数据规则

- 首页使用 `WebSite`
- 博客文章页使用 `Article`
- `Article` 至少包含：标题、摘要、发布时间、更新时间、作者、主页面地址

## sitemap 更新机制

- 由后端 `/sitemap.xml` 动态生成
- 仅包含首页和所有已发布文章页
- 新文章发布后，无需手工更新，接口会按数据库最新状态返回

## robots 规则

- 由后端 `/robots.txt` 直接返回
- 包含站点地图地址
- 显式禁止 `/chat` 和 `/statistics`

## 实施要求

- 新页面开发时，必须先确定是否可索引，再补 `title`、`description`、`canonical`、`og:*`
- 如果页面承载公开内容，必须评估是否需要服务端直出或静态生成
- 如果页面是博客文章详情，必须同时考虑前端 `usePageSeo` 和服务端可抓取 HTML