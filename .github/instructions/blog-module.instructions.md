---
description: "Use when changing blog post list/detail/editor/manage flows, blog comments, blog API shapes, or blog data-store behavior."
name: "Blog Module Contract"
applyTo:
  - "frontend/src/pages/Blog*.jsx"
  - "frontend/src/pages/UserHomePage.jsx"
  - "frontend/src/components/Blog*.jsx"
  - "frontend/src/services/blogApi.js"
  - "backend/src/routes/blog.js"
  - "backend/src/services/blogStore.js"
  - "backend/src/models/Blog*.js"
---

# Blog Module Contract

- 仓库级的身份、slug 和点赞通用约束已收敛到 [doc/convention/README.md](../../doc/convention/README.md)。本文件只保留 Blog 模块自身的联动契约。
- Keep route shapes aligned across [frontend/src/App.jsx](../../frontend/src/App.jsx), [frontend/src/services/blogApi.js](../../frontend/src/services/blogApi.js), and [backend/src/routes/blog.js](../../backend/src/routes/blog.js). The active URLs are `/blog`, `/blog/:nickname`, `/blog/post/:slug`, `/blog/new`, `/blog/edit/:slug`, and `/blog/manage`, while backend blog APIs live under `/api/blog`.
- Published and trashed state are separate concerns. Public listings only show published, non-trashed posts; trashed posts stay recoverable through manage views until permanent deletion removes both the post and its related comments.
- The post detail route supports optional auth so authors can view their own unpublished posts. Preserve the `getOptionalUsername()` and unpublished fallback behavior in [backend/src/routes/blog.js](../../backend/src/routes/blog.js) when adjusting visibility rules.
- Comment creation requires auth and increments `commentCount` in the post record. If comment response shapes or pagination change, update [backend/src/services/blogStore.js](../../backend/src/services/blogStore.js), [frontend/src/services/blogApi.js](../../frontend/src/services/blogApi.js), and [frontend/src/components/BlogComment.jsx](../../frontend/src/components/BlogComment.jsx) in the same task.
