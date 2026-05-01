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

- Treat [apis/chat.md](../../apis/chat.md) as the public contract. If the request shape or streamed payload changes, update the doc in the same task.
- Keep backend streaming as SSE with `data: <json>\n\n` frames and a final `data: [DONE]\n\n` marker.
- [frontend/src/services/api.js](../../frontend/src/services/api.js) currently parses one JSON object per `data:` line and yields `obj.content`. Change the backend emitter and frontend parser together.
- When the stream has already started, send follow-up failures as SSE data and end the response instead of switching back to a JSON response body.
- [conf/nginx/nginx.conf](../../conf/nginx/nginx.conf) must keep buffering disabled for `/api` so streamed tokens reach the browser incrementally.