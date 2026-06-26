# 开发规约

本文收敛仓库级开发约束。项目结构总览见 [项目架构描述](../architecture/README.md)；模块专属规则仍以 [auth-profile.instructions.md](../../.github/instructions/auth-profile.instructions.md)、[blog-module.instructions.md](../../.github/instructions/blog-module.instructions.md)、[chat-state.instructions.md](../../.github/instructions/chat-state.instructions.md) 和 [chat-streaming.instructions.md](../../.github/instructions/chat-streaming.instructions.md) 为准。

## 文档列表

- [development.md](development.md)：开发命令、验证流程、目录边界与归属。
- [git.md](git.md)：Git 提交约定（Conventional Commits）。
- [backend.md](backend.md)：后端 ESM、模型配置、敏感信息与种子数据约束。
- [auth.md](auth.md)：鉴权体系、身份字段、注册流程、昵称规则与 guest 模式。
- [chat.md](chat.md)：Chat 状态管理、流式 SSE 协议、Nginx 缓冲与联动变更。
- [blog.md](blog.md)：Blog 路由、slug 规则、发布/垃圾桶状态与评论约束。
- [upload.md](upload.md)：上传链路、文件验证、存储路径与缓存策略。
- [frontend.md](frontend.md)：国际化、CSS 变量、AuthContext 复用与服务层共享约定。
- [deployment.md](deployment.md)：部署路径、Nginx/Compose 协同与 base path 约束。

## 关联文档入口

- 架构总览：[doc/architecture/README.md](../architecture/README.md)
- API 规范：[doc/apis/README.md](../apis/README.md)、[doc/apis/API开发规范.md](../apis/API开发规范.md)、[doc/apis/API文档格式.md](../apis/API文档格式.md)
- UI 规范：[doc/ui/README.md](../ui/README.md)、[doc/ui/frontend_design_tokens.md](../ui/frontend_design_tokens.md)、[doc/ui/frontend_ui_style.md](../ui/frontend_ui_style.md)
- 部署文档：[doc/ops/README.md](../ops/README.md)
