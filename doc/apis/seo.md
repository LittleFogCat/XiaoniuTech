# SEO 与公开页面接口

本文件记录不走 `/api` 前缀的公开 SEO 接口与博客文章服务端渲染页面。

### 获取 robots.txt

**接口描述**

返回站点爬虫规则文本，并指向当前域名下的站点地图。

**请求路径**

`GET /robots.txt`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```text
User-agent: *
Allow: /
Disallow: /statistics
Disallow: /chat
Sitemap: https://example.com/sitemap.xml
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| 响应体 | text/plain | 是 | `robots.txt` 文本内容。站点根域名会根据当前请求动态生成。 |

**所需权限**

无需登录。

**其他说明**

返回 `Content-Type: text/plain; charset=utf-8`。

### 获取 sitemap.xml

**接口描述**

返回公开博客文章和站点首页的 XML 站点地图。

**请求路径**

`GET /sitemap.xml`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-05-11T08:00:00.000Z</lastmod>
  </url>
  <url>
    <loc>https://example.com/blog/post/3fa2bc11de09a7ef</loc>
    <lastmod>2026-05-11T08:10:00.000Z</lastmod>
  </url>
</urlset>
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| 响应体 | application/xml | 是 | 站点地图 XML 文本，包含首页和所有已发布、未进垃圾桶文章。 |

**所需权限**

无需登录。

**其他说明**

返回 `Content-Type: application/xml; charset=utf-8`。

### 获取博客文章 SEO 页面

**接口描述**

按博客文章 slug 返回服务端渲染的 HTML 页面，供搜索引擎抓取 SEO 元信息和正文内容。

**请求路径**

`GET /blog/post/:slug`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| slug | string | 是 | 博客文章 slug，例如 `3fa2bc11de09a7ef`。 |

**请求参数**

无。

**返回示例**

此接口直接返回 HTML 文本，页面中包含：

- `<title>`、`description`、`canonical` 和 Open Graph 元标签。
- `Article` 类型的 JSON-LD 结构化数据。
- 将 Markdown 正文渲染后的文章内容。

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| 响应体 | text/html | 是 | 文章 SEO HTML 页面。 |

**所需权限**

无需登录。

**其他说明**

- 仅支持已发布、未进垃圾桶的文章。
- 文章不存在时返回 `404` HTML 页面，而不是 JSON。
- 成功返回 `Content-Type: text/html; charset=utf-8`。