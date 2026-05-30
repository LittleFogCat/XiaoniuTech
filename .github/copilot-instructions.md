# Project Guidelines

Repository-wide guidance has been centralized into dedicated documents to avoid keeping the same architecture and convention text in multiple places.

## Core Docs

- Architecture: [doc/architecture.md](../doc/architecture.md)
- Development conventions: [doc/convention.md](../doc/convention.md)
- API docs: [doc/apis/README.md](../doc/apis/README.md)
- UI docs: [doc/ui/README.md](../doc/ui/README.md)
- Deployment docs: [doc/部署说明.md](../doc/部署说明.md)

## Domain-Specific Instruction Files

- Auth and profile: [auth-profile.instructions.md](instructions/auth-profile.instructions.md)
- Blog module: [blog-module.instructions.md](instructions/blog-module.instructions.md)
- Chat state: [chat-state.instructions.md](instructions/chat-state.instructions.md)
- Chat streaming: [chat-streaming.instructions.md](instructions/chat-streaming.instructions.md)

Use the core docs for repository-wide stack, architecture, build, validation, and conventions. Load the matching domain instruction file when a task touches a scoped module.