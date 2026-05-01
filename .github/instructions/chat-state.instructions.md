---
description: "Use when changing frontend chat state, guest mode, chat CRUD flows, or recovery behavior in the chat app."
name: "Chat State Guidelines"
applyTo: "frontend/src/pages/ChatPage.jsx"
---

# Chat State Guidelines

- [frontend/src/pages/ChatPage.jsx](../../frontend/src/pages/ChatPage.jsx) owns two storage modes: logged-in users persist chats through backend CRUD APIs, while guest mode persists to localStorage.
- Preserve the guest keys and limits unless you intentionally migrate them: `auth_mode`, `guest_chat_records`, and the 10-chat cap.
- Keep create, delete, and select flows consistent between guest and logged-in modes so title, model, and message updates stay aligned.
- Logged-in updates intentionally recover from backend 404s by recreating the chat after storage resets. Do not remove that fallback without replacing it with an equivalent recovery path.
- After state-flow changes, verify both an empty-chat start and an existing-chat continuation path.