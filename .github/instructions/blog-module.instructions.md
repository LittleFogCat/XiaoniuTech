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

- Keep route shapes aligned across [frontend/src/App.jsx](../../frontend/src/App.jsx), [frontend/src/services/blogApi.js](../../frontend/src/services/blogApi.js), and [backend/src/routes/blog.js](../../backend/src/routes/blog.js). The active URLs are `/blog`, `/blog/:nickname`, `/blog/post/:slug`, `/blog/new`, `/blog/edit/:slug`, and `/blog/manage`, while backend blog APIs live under `/api/blog`.
- Blog ownership uses the email-backed token identity (`req.user.username`), but public profile URLs and comment links use `User.nickname`. When changing author/profile behavior, review [backend/src/models/User.js](../../backend/src/models/User.js), [backend/src/routes/auth.js](../../backend/src/routes/auth.js), [frontend/src/pages/UserHomePage.jsx](../../frontend/src/pages/UserHomePage.jsx), and [frontend/src/components/BlogComment.jsx](../../frontend/src/components/BlogComment.jsx) together.
- Slugs are generated server-side as random hashes in [backend/src/services/blogStore.js](../../backend/src/services/blogStore.js); they are not derived from titles. Do not add title-based slug editing on the frontend without changing the backend store and data model together.
- Published and trashed state are separate concerns. Public listings only show published, non-trashed posts; trashed posts stay recoverable through manage views until permanent deletion removes both the post and its related comments.
- The post detail route supports optional auth so authors can view their own unpublished posts. Preserve the `getOptionalUsername()` and unpublished fallback behavior in [backend/src/routes/blog.js](../../backend/src/routes/blog.js) when adjusting visibility rules.
- Comment creation requires auth and increments `commentCount` in the post record. If comment response shapes or pagination change, update [backend/src/services/blogStore.js](../../backend/src/services/blogStore.js), [frontend/src/services/blogApi.js](../../frontend/src/services/blogApi.js), and [frontend/src/components/BlogComment.jsx](../../frontend/src/components/BlogComment.jsx) in the same task.
- Likes are lightweight counters with client-side dedupe via `LIKED_POSTS_KEY`; they are not a user-owned relational feature. Keep [frontend/src/services/blogApi.js](../../frontend/src/services/blogApi.js) and [backend/src/routes/blog.js](../../backend/src/routes/blog.js) consistent if you change like semantics.