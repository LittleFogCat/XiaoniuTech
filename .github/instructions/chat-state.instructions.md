---
description: "Use when changing frontend chat state, guest mode, chat CRUD flows, or recovery behavior in the chat app."
name: "Chat State Guidelines"
applyTo: "frontend/src/pages/ChatPage.jsx"
---

# Chat State Guidelines

- [frontend/src/pages/ChatPage.jsx](../../frontend/src/pages/ChatPage.jsx) owns two storage modes: logged-in users persist chats through backend CRUD APIs, while guest mode persists to localStorage.
- Guest keys, guest limits and logged-in 404 recreate are repository-level chat conventions now documented in [doc/convention/README.md](../../doc/convention/README.md). Preserve them unless the task explicitly includes a migration plan.
- After state-flow changes, verify both an empty-chat start and an existing-chat continuation path.