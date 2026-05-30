# AGENTS.md

XiaoNiu Tech 的仓库级架构与开发规约已集中到文档目录维护，避免在多个总纲文件中重复描述同一份信息。

## 中央文档

- 项目架构： [doc/architecture.md](doc/architecture.md)
- 开发规约： [doc/convention.md](doc/convention.md)
- API 文档入口： [doc/apis/README.md](doc/apis/README.md)
- UI 文档入口： [doc/ui/README.md](doc/ui/README.md)
- 部署说明： [doc/部署说明.md](doc/部署说明.md)

## 模块专属约束

- 认证与资料： [.github/instructions/auth-profile.instructions.md](.github/instructions/auth-profile.instructions.md)
- Blog 模块： [.github/instructions/blog-module.instructions.md](.github/instructions/blog-module.instructions.md)
- Chat 状态： [.github/instructions/chat-state.instructions.md](.github/instructions/chat-state.instructions.md)
- Chat 流式协议： [.github/instructions/chat-streaming.instructions.md](.github/instructions/chat-streaming.instructions.md)

处理仓库级问题时，以上两份中央文档视为总入口；处理特定模块时，再加载对应的模块指令文件。
