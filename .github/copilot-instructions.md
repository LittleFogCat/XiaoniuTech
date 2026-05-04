# Project Guidelines

## Architecture
- Treat this repo as a unified React + Vite frontend in `frontend/` plus four active backend slices mounted from [backend/src/index.js](../backend/src/index.js): auth, chat, blog, and upload.
- The only deployable static output is [frontend/dist/](../frontend/dist/). Treat [frontend/chat/](../frontend/chat/) and [frontend/home.bak/](../frontend/home.bak/) as legacy or backup content, not active product code.
- Shared deployment and runtime config lives in [conf/compose/docker-compose.yml](../conf/compose/docker-compose.yml), [conf/nginx/nginx.conf](../conf/nginx/nginx.conf), [conf/nginx/conf.d/chat.location](../conf/nginx/conf.d/chat.location), [conf/nginx/conf.d/xn.location](../conf/nginx/conf.d/xn.location), and [conf/backend/](../conf/backend/).
- Prefer linking to existing docs instead of restating them. Primary entry points are [README.md](../README.md), [doc/apis/chat.md](../doc/apis/chat.md), [doc/apis/users.md](../doc/apis/users.md), [doc/部署说明.md](../doc/部署说明.md), and [doc/目录结构说明.md](../doc/目录结构说明.md).

## Build And Test
- Run backend commands in `backend/`: `npm install`, `npm start`, `npm run dev`.
- Backend maintenance commands also include `npm run migrate:legacy-chats`.
- Run frontend commands in `frontend/`: `npm install`, `npm run dev`, `npm run build`, `npm run preview`.
- There is no `npm test` script in either package. `backend/test.js` is a manual smoke script, not an automated test suite.
- Before claiming backend changes work, verify MongoDB availability. The server exits on startup if the database connection fails, and `/health` is the cheapest server check.
- Dockerized local runs depend on `frontend/dist` existing for Nginx, so build the unified frontend before validating container routing.
- Packaging and deployment flows also use [script/build.bat](../script/build.bat), [script/build.ps1](../script/build.ps1), and [script/install.sh](../script/install.sh); keep those scripts and deployment docs aligned when changing artifacts or deploy layout.

## Conventions
- Backend uses Node.js ESM (`"type": "module"`), so preserve explicit `.js` import paths and existing module style.
- Backend routing is split: auth and user profile live in [backend/src/routes/auth.js](../backend/src/routes/auth.js), chat CRUD and streaming live in [backend/src/routes/chat.js](../backend/src/routes/chat.js), blog lives in [backend/src/routes/blog.js](../backend/src/routes/blog.js), and uploads live in [backend/src/routes/upload.js](../backend/src/routes/upload.js). Keep changes in the owning slice instead of merging unrelated concerns back together.
- Production chat is served under `/chat/`. Keep [frontend/vite.config.js](../frontend/vite.config.js), [conf/nginx/nginx.conf](../conf/nginx/nginx.conf), and the Nginx location snippets in sync when changing base paths or routing.
- Model metadata comes from [backend/files/models.json](../backend/files/models.json) through [backend/src/config/models.js](../backend/src/config/models.js). Prefer updating that config instead of hardcoding model lists elsewhere.
- Guest mode, chat persistence, and 404 recovery behavior live in [frontend/src/pages/ChatPage.jsx](../frontend/src/pages/ChatPage.jsx); preserve that flow when changing chat creation, deletion, or recovery behavior.
- Authentication is email-based. `CHAT_AUTH_SECRET` must come from environment or secret management, and the removed admin fallback should not be reintroduced.
- Public blog URLs use `User.nickname`, while auth and ownership still use the email-backed `username` in tokens. Keep [backend/src/models/User.js](../backend/src/models/User.js), [backend/src/routes/auth.js](../backend/src/routes/auth.js), [frontend/src/pages/UserHomePage.jsx](../frontend/src/pages/UserHomePage.jsx), and comment/profile links aligned when changing nickname or profile behavior.
- Runtime identity records come from MongoDB; [conf/backend/identities/](../conf/backend/identities/) only provides seed files for missing records during backend startup.

## Pitfalls
- Do not introduce hardcoded secrets or default credentials. [backend/src/services/auth.js](../backend/src/services/auth.js) and [backend/src/services/provider.js](../backend/src/services/provider.js) both rely on runtime secrets and are sensitive.
- Streaming changes are cross-cutting: preserve SSE `data:` framing, `[DONE]` termination, and unbuffered proxying through Nginx.
- Blog likes are currently anonymous counter mutations on the backend with client-side dedupe in localStorage. Do not present them as per-user server state without changing both [backend/src/routes/blog.js](../backend/src/routes/blog.js) and [frontend/src/services/blogApi.js](../frontend/src/services/blogApi.js).
- Avatar uploads are validated and resized on both client and server, and stored outside the repo (`APPDATA/xntech/images` on Windows, `/app/files` in containers). Change [frontend/src/components/AvatarUpload.jsx](../frontend/src/components/AvatarUpload.jsx) and [backend/src/routes/upload.js](../backend/src/routes/upload.js) together.