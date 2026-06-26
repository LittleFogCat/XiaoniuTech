# Blog 约束

- 前端博客路由、[frontend/src/services/blogApi.js](../../frontend/src/services/blogApi.js) 和 [backend/src/routes/blog.js](../../backend/src/routes/blog.js) 要保持一致，当前公开路由是 `/blog`、`/blog/:nickname`、`/blog/post/:slug`、`/blog/new`、`/blog/edit/:slug`、`/blog/manage`。
- 博客 slug 由后端生成随机 hash，不是标题派生值；编辑文章时不能把标题修改自动映射成 slug 变更。
- 已发布与已删除是两套状态：公开列表只显示已发布且未进垃圾桶的文章，垃圾桶中的文章在永久删除前应保持可恢复。
- 文章详情页允许作者通过可选鉴权查看自己的未发布内容；调整可见性时不要破坏这条 unpublished fallback。
- 点赞是匿名计数器，前端仅通过 localStorage 做去重，不是服务端的"用户点赞关系"。
- 评论创建需要登录，并且会联动更新文章评论数；评论接口的响应形状或分页逻辑变化时要同步前后端。
