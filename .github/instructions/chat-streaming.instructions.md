---
description: "Use when changing SSE chat streaming, /api/chat, provider integration, frontend stream parsing, or nginx proxying for chat."
name: "Chat Streaming Contract"
applyTo:
  - "backend/src/routes/chat.js"
  - "backend/src/services/provider.js"
  - "frontend/src/services/api.js"
  - "conf/nginx/nginx.conf"
  - "apis/chat.md"
---

# Chat Streaming Contract

- Treat [doc/apis/chat.md](../../doc/apis/chat.md) as the public contract. If the request shape or streamed payload changes, update the doc in the same task.
- Repository-level SSE framing, parser alignment and Nginx buffering rules are centralized in [doc/convention/README.md](../../doc/convention/README.md). This file keeps the module-scoped change set together.
- [frontend/src/services/api.js](../../frontend/src/services/api.js) currently parses one JSON object per `data:` line and yields `obj.content`. Change the backend emitter and frontend parser together.