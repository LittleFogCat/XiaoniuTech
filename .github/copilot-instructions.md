# Project Guidelines

## Architecture
- Treat this repo as three slices: `backend/` for the Express + MongoDB API, `frontend/chat/` for the React + Vite chat app, and `frontend/` for the deployed static home page.
- `frontend/home.bak/` is backup content, not the active site.
- Shared deployment config lives in [docker-compose.yml](../docker-compose.yml) and [conf/nginx/nginx.conf](../conf/nginx/nginx.conf). API contracts live in [apis/chat.md](../apis/chat.md) and [apis/users.md](../apis/users.md).

## Build And Test
- Run backend commands in `backend/`: `npm install`, `npm start`, `npm run dev`.
- Run chat frontend commands in `frontend/chat/`: `npm install`, `npm run dev`, `npm run build`, `npm run preview`.
- The static home page in `frontend/` does not require a Node build step.
- There is no `npm test` script in either package. `backend/test.js` is a manual smoke script, not an automated test suite.
- Before claiming backend changes work, verify MongoDB availability. The server exits on startup if the database connection fails, and `/health` is the cheapest server check.
- Dockerized local runs depend on `frontend/chat/dist` existing for Nginx, so build the chat app before validating container routing.

## Conventions
- Backend uses Node.js ESM (`"type": "module"`), so preserve explicit `.js` import paths and existing module style.
- Chat APIs are mounted under `/api`. Keep request and response shapes aligned with [apis/chat.md](../apis/chat.md) and [apis/users.md](../apis/users.md).
- Production chat is served under `/chat/`. Keep [frontend/chat/vite.config.js](../frontend/chat/vite.config.js) and [conf/nginx/nginx.conf](../conf/nginx/nginx.conf) in sync when changing base paths or routing.
- Model metadata comes from [backend/files/models.json](../backend/files/models.json) through [backend/src/config/models.js](../backend/src/config/models.js). Prefer updating that config instead of hardcoding model lists elsewhere.
- Guest mode, chat persistence, and 404 recovery behavior live in [frontend/chat/src/App.jsx](../frontend/chat/src/App.jsx); preserve that flow when changing chat creation, deletion, or recovery behavior.

## Pitfalls
- Do not introduce more hardcoded secrets. [backend/src/services/provider.js](../backend/src/services/provider.js) already contains sensitive provider setup and should be handled carefully.
- Streaming changes are cross-cutting: preserve SSE `data:` framing, `[DONE]` termination, and unbuffered proxying through Nginx.