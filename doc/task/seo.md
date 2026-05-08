# SEO 优化

## 任务描述

对项目中所有页面进行 SEO 优化，并建立 SEO 规范，确保后续新开发的页面默认符合 SEO 要求。

## 详细要求

### 1. 基础 Meta 标签

为所有页面添加以下 Meta 标签，每个页面的内容需独立，不可共用：

- `<title>`：格式为 `页面标题 - 网站名称`；
- `<meta name="description">`：页面描述，120 字以内；
- `<link rel="canonical">`：当前页面的规范 URL；
- Open Graph 标签：`og:title`、`og:description`、`og:image`、`og:url`。

以下页面不需要被搜索引擎索引，添加 `<meta name="robots" content="noindex, nofollow">`：

- 访问统计页面及其所有子页面（`/statistics/*`）；
- 聊天页面及其所有子页面（`/chat/*`）。

### 2. 结构化数据

- 网站首页：添加 `WebSite` schema，包含网站名称和 URL；
- 博客页面：添加 `Article` schema，包含文章标题、发布时间、作者信息。

### 3. sitemap.xml

在 `/sitemap.xml` 路径下，动态生成站点地图，包含以下页面：

- 首页；
- 所有已发布的博客文章页面。

每次发布新博客文章时，sitemap 需自动更新。聊天页面、统计页面等无需收录。

### 4. robots.txt

在 `/robots.txt` 路径下提供以下内容：

```
User-agent: *
Allow: /
Disallow: /statistics/
Disallow: /chat/
Sitemap: ${my_domain}/sitemap.xml
```
确保该文件可以被搜索引擎访问，并且内容符合上述要求。

### 5. React SPA 特殊处理

项目为 React SPA，`index.html` 为唯一入口，爬虫无法执行 JS，动态注入的 meta 标签对搜索引擎无效。需要针对性处理：

- **博客页面**：需要对博客相关路由（`/blog/*`）配置服务端渲染（SSR）或静态生成（SSG），确保爬虫可以获取到完整的页面内容和 meta 标签。推荐方案为引入 [React Router + Vite SSR](https://vitejs.dev/guide/ssr) 或迁移至 Next.js；
- **其他页面**（首页、聊天、统计等）：非内容型页面对 SEO 要求低，可继续使用 CSR，通过 `react-helmet-async` 等库管理 meta 标签，满足社交分享预览（Open Graph）的需求即可；
- **sitemap 和 robots.txt**：需由服务端直接返回静态文件，不能依赖前端路由处理，需在服务器（Nginx 或 Node 服务）层面配置对应路径的响应。

### 6. SEO 开发规范

新增 SEO 开发规范文档，位于 `docs/seo.md`，内容包括：

- 各类页面（首页、博客、功能页）所需的 Meta 标签模板；
- 哪些页面需要 noindex；
- 结构化数据的添加方式；
- sitemap 的更新机制。

封装一个通用的 SEO 组件（或 helper 函数），供所有页面调用，减少重复代码。新页面开发时必须使用该组件设置页面的 SEO 信息。

## 验收标准

- 所有页面均有独立的 `title` 和 `description`，无重复；
- 博客页面包含正确的 `Article` schema；
- `/sitemap.xml` 可以正常访问，且包含所有应收录的页面；
- `/robots.txt` 可以正常访问，内容符合上述要求；
- 统计页面和聊天页面无法被搜索引擎索引；
- SEO 组件已封装，新页面开发规范文档已更新。