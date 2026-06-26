# Chat 与流式协议

- [frontend/src/pages/ChatPage.jsx](../../frontend/src/pages/ChatPage.jsx) 同时承载两套状态源：登录用户通过后端 CRUD 持久化，guest 模式通过 localStorage 持久化。
- 除非明确做数据迁移，否则要保留 `auth_mode`、`guest_chat_records` 和 10 个 guest 会话上限这组现有约束。
- Chat 的 create、delete、select 和消息更新要在 guest 与登录态之间保持一致的标题、模型和消息同步行为。
- 登录态聊天更新在后端返回 404 时会通过"重建会话"恢复，这条 fallback 不能被静默移除。
- 变更聊天状态流后，至少回归"空白会话开始发送"和"已有会话继续发送"两条路径。
- 聊天流式输出必须继续使用 SSE：每帧 `data: <json>\n\n`，结束帧 `data: [DONE]\n\n`。
- 一旦流已经开始，后续错误也要继续用 SSE data 帧返回，而不是切回普通 JSON。
- Nginx 对 `/api` 的代理必须关闭 buffering，否则浏览器拿不到增量流。
- 聊天请求形状或流式载荷变化时，要把 [backend/src/services/provider.js](../../backend/src/services/provider.js)、[backend/src/routes/chat.js](../../backend/src/routes/chat.js)、[frontend/src/services/api.js](../../frontend/src/services/api.js)、[conf/nginx/nginx.conf](../../conf/nginx/nginx.conf) 和 [doc/apis/chat.md](../../doc/apis/chat.md) 一起更新。
