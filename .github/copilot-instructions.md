# Project Guidelines

## Architecture
- Treat this repo as two active slices: `backend/` for the Express + MongoDB API, and `frontend/` for the unified React + Vite frontend source.
- The unified frontend build output is written to `frontend/dist/` and is the only static site directory that should be deployed.
- `frontend/home.bak/` is backup content, not the active site.
- Shared deployment config lives in [conf/compose/docker-compose.yml](../conf/compose/docker-compose.yml) and [conf/nginx/nginx.conf](../conf/nginx/nginx.conf). API contracts live in `apis/chat.md` and `apis/users.md`.

## Build And Test
- Run backend commands in `backend/`: `npm install`, `npm start`, `npm run dev`.
- Run frontend commands in `frontend/`: `npm install`, `npm run dev`, `npm run build`, `npm run preview`.
- There is no `npm test` script in either package. `backend/test.js` is a manual smoke script, not an automated test suite.
- Before claiming backend changes work, verify MongoDB availability. The server exits on startup if the database connection fails, and `/health` is the cheapest server check.
- Dockerized local runs depend on `frontend/dist` existing for Nginx, so build the unified frontend before validating container routing.

## Conventions
- Backend uses Node.js ESM (`"type": "module"`), so preserve explicit `.js` import paths and existing module style.
- Chat APIs are mounted under `/api`. Keep request and response shapes aligned with `apis/chat.md` and `apis/users.md`.
- Production chat is served under `/chat/`. Keep [frontend/vite.config.js](../frontend/vite.config.js) and [conf/nginx/nginx.conf](../conf/nginx/nginx.conf) in sync when changing base paths or routing.
- Model metadata comes from [backend/files/models.json](../backend/files/models.json) through [backend/src/config/models.js](../backend/src/config/models.js). Prefer updating that config instead of hardcoding model lists elsewhere.
- Guest mode, chat persistence, and 404 recovery behavior live in [frontend/src/pages/ChatPage.jsx](../frontend/src/pages/ChatPage.jsx); preserve that flow when changing chat creation, deletion, or recovery behavior.

## Pitfalls
- Do not introduce more hardcoded secrets. [backend/src/services/provider.js](../backend/src/services/provider.js) already contains sensitive provider setup and should be handled carefully.
- Streaming changes are cross-cutting: preserve SSE `data:` framing, `[DONE]` termination, and unbuffered proxying through Nginx.