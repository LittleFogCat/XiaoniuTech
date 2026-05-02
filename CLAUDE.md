# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XiaoniuTech is an AI chat platform with a React + Vite frontend and an Express + MongoDB backend, deployed via Docker Compose with Nginx as the reverse proxy and static file server.

## Development Commands

### Backend (`backend/`)

```bash
cd backend
npm install              # Install dependencies
npm start                # Start production server
npm run dev              # Start with --watch for hot reload
npm run migrate:legacy-chats  # Migrate legacy chat data
```

The server runs on port 3001 by default. It exits immediately if MongoDB is unreachable. Check `/health` for a quick liveness check.

### Frontend (`frontend/`)

```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Dev server on port 5173, proxies /api to localhost:3001
npm run build            # Production build → frontend/dist/
npm run preview          # Preview production build
```

There are no `npm test` scripts. `backend/test.js` is a manual smoke-test script, not an automated suite.

### Docker (production-like)

```bash
# Build the unified frontend first (Nginx needs frontend/dist)
cd frontend && npm run build

# Start all services
docker compose -f conf/compose/docker-compose.yml up -d --build

# Rebuild only backend
docker compose -f conf/compose/docker-compose.yml build backend
docker compose -f conf/compose/docker-compose.yml up -d backend
```

## Architecture

### Backend (`backend/src/`)

- **Entry point**: `src/index.js` — Express app, mounts all routes under `/api`, connects MongoDB, initializes identity catalog from seed files.
- **Routes**: `src/routes/chat.js` — single router handling `/api/chat` (SSE streaming), `/api/models`, `/api/identities`, `/api/chats` (CRUD, auth-required), `/api/login`, `/api/register/*`.
- **Models**: Mongoose schemas in `src/models/` — `Chat` (messages, chatTarget), `User` (email, passwordHash), `Identity` (name, description, personaDefinition), `PendingRegistration` (email verification).
- **Services**: `src/services/` — `provider.js` (multi-provider AI streaming via OpenAI-compatible APIs), `auth.js` (HMAC-signed tokens, scrypt password hashing), `chatStore.js` (chat CRUD with identity resolution), `identityStore.js` (seed import from markdown files into MongoDB), `mail.js` (SMTP email sending), `captchaStore.js` (in-memory captcha challenges).
- **Config**: `src/config/` — `models.js` reads model definitions from `conf/backend/models.json` (or container path `/app/config/models.json`), maps provider/model combos (longcat, zai, openrouter, deepseek) to API endpoints. `identities.js` parses markdown seed files. `backend.js` reads `conf/backend/backend.conf` for log control.
- **Auth flow**: Tokens are HMAC-SHA256 signed with `CHAT_AUTH_SECRET`. Password hashing uses scrypt with SHA-512 digest.

### Frontend (`frontend/src/`)

- **Entry**: `main.jsx` → `App.jsx` (BrowserRouter). Routes: `/` (HomePage), `/chat` (ChatPage), `/games` (PlaceholderPage), wildcard redirects to `/`.
- **Pages**: `src/pages/ChatPage.jsx` (~50KB, the main app). Supports guest mode (chats in localStorage, max 10), logged-in mode (server-persisted chats), identity/agent selection, SSE streaming, and 404 recovery for deleted chats.
- **API layer**: `src/services/api.js` — all backend calls including SSE streaming via async generator. Auth tokens stored in `localStorage.auth_token`.
- **Components**: `ChatInput`, `ChatMessage`, `Sidebar`, `Login`, `ModelSelect`, `IdentityPicker`, `IdentityAvatar`.
- **Styling**: Tailwind CSS + custom `index.css`. Fonts: Noto Sans SC, IBM Plex Mono, Space Grotesk. Dark theme, background `#050816`.

### Identity / Agent System

Identities are defined as Markdown seed files in `conf/backend/identities/*.md`. On startup, the backend imports any new identities into MongoDB (existing DB records are never overwritten). Markdown headings map to identity fields: `# 名称` → name, `# 描述` → description, `# 人格定义` → personaDefinition. The persona definition is injected as a system message when `chatTarget.type === 'identity'`.

### Model Configuration

`conf/backend/models.json` defines providers and models. Each provider has a `baseUrl` and list of `models`. The `models.js` config module resolves model IDs in `provider/modelId` format and constructs OpenAI-compatible API requests. The container path `/app/config/models.json` takes priority; falls back to the bundled file.

### Data Flow (Chat)

1. Frontend sends `POST /api/chat` with `{ model, messages, chatTarget }`.
2. Backend resolves `chatTarget` → fetches identity persona from MongoDB → prepends system message.
3. Backend routes to the appropriate AI provider via `streamCompletions()`, yielding SSE chunks.
4. Frontend reads the SSE stream via `streamChat()` async generator, appending content to the last assistant message.
5. Frontend persists chat to server (logged-in) or localStorage (guest).

### Nginx Routing

- `/api/` → proxied to `backend:3001` with `proxy_buffering off` for SSE streaming.
- `/chat` → served as SPA fallback to `/index.html`.
- `/` → SPA fallback for the main site.
- `/blog` → 301 redirect to external site.

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/routes/chat.js` | All API routes and auth middleware |
| `backend/src/services/provider.js` | Multi-provider AI streaming (contains API key handling) |
| `backend/src/config/models.js` | Model registry, resolves provider+model to API endpoint |
| `backend/src/services/chatStore.js` | Chat CRUD with identity resolution and uniqueness enforcement |
| `frontend/src/pages/ChatPage.jsx` | Main chat UI, guest mode, chat persistence, 404 recovery |
| `frontend/src/services/api.js` | Frontend API client, SSE streaming |
| `conf/compose/docker-compose.yml` | Service orchestration |
| `conf/nginx/conf.d/chat.location` | API proxy + chat SPA routing |
| `conf/nginx/conf.d/xn.location` | Main site + blog redirect |
| `conf/backend/models.json` | Model/provider definitions |
| `script/build.bat` | Windows packaging script |
| `script/install.sh` | Linux server deployment script |

## Documentation Conventions

- Plan files are stored in `./doc/plan/`, named as `plan_<topic>_<date>.md`.
- Task/requirement documents are stored in `./doc/task/`.
- API contracts are documented in `./doc/apis/`.

## Conventions & Pitfalls

- Backend uses Node.js ESM (`"type": "module"`). All imports must use explicit `.js` extensions.
- Chat APIs live under `/api`. Keep request/response shapes aligned with `doc/apis/chat.md`.
- SSE streaming uses `data:` framing with `[DONE]` termination. Nginx must have `proxy_buffering off` for `/api/` location.
- Production chat is served under `/chat/`. Keep `frontend/vite.config.js` and `conf/nginx/conf.d/chat.location` in sync when changing base paths.
- Model metadata should be updated via `conf/backend/models.json`, not hardcoded elsewhere.
- Do not introduce more hardcoded secrets — `backend/src/services/provider.js` already contains sensitive provider configuration.
- Identity seed files only import on first encounter. Modifying an already-imported seed file does not update the database record.
- A user can only have one chat per identity (unique index on `userId + chatTarget.id`).
- Guest chat limit is 10, enforced client-side in `ChatPage.jsx`.
- `frontend/chat/` is a legacy sub-project predating the unified frontend merge. The active frontend is `frontend/`, with build output at `frontend/dist/`.
