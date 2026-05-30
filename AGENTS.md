# AGENTS.md

XiaoNiu Tech — personal website with AI Chat, blog, user management. React+Vite front end, Express+MongoDB back end, Docker Compose+Nginx deployment.

## Quick start

```bash
cd backend && npm install && npm run dev    # :3001
cd frontend && npm install && npm run dev   # :5173, proxies /api → :3001
```

Verify with `GET /health`. No test suite exists.

## Monorepo boundaries

```
frontend/         ← active SPA (Vite + React + Tailwind)
frontend/chat/    ← LEGACY, do not modify
backend/          ← Express ESM, all routes under /api
conf/             ← deploy config: compose, nginx, backend/models.json
script/           ← build.bat, build.ps1, install.sh, deploy.sh
```

## Key conventions an agent will miss

### Backend ESM

`"type": "module"` — every relative import **must** end in `.js`. Example:

```js
import { requireAuth } from './middleware/auth.js';
```

### Model config resolution

`conf/backend/models.json` is the **single** source of truth for AI provider/model config. Runtime path resolution (`backend/src/config/models.js:13-21`):

1. `$MODELS_FILE_PATH` env if set
2. `/app/config/models.json` (Docker container, mounted from `conf/backend/`)
3. Fallback to `conf/backend/models.json` (dev)

API keys in models.json use `${ENV_VAR}` placeholders resolved at runtime by `resolveEnvVars()`. Do **not** hardcode provider→env mappings in code.

### SSE streaming contract

- Format: `data: <json>\n\n` per frame, final `data: [DONE]\n\n`
- Nginx **must** have `proxy_buffering off` for `/api` (SSE won't work otherwise)
- After stream starts, send errors as SSE `data:` — never switch back to JSON body
- Change `backend/src/services/provider.js`, `frontend/src/services/api.js`, and nginx config **together**

### Blog slugs are random hashes

Posts identified by 16-char random hex hash generated in `backend/src/services/blogStore.js`. Slugs are **not** title-derived and must never change on edit. Do not add title-based slug logic.

### Guest mode = client-only

No backend endpoint special-cases guests. Guest persistence is `localStorage` keys (`guest_chat_records`, `auth_mode`), 10-chat cap enforced in `frontend/src/pages/ChatPage.jsx`. `requireAuth` endpoints still need a bearer token.

### Username vs. nickname

- Auth/ownership = email-backed `username` in token (`req.user.username`)
- Public blog URLs & comment display = `User.nickname`
- Nickname rules: alphanumeric + Chinese only, 1–32 chars, unique. Reserved: `post`, `new`, `edit`, `manage`
- Changing nickname behavior requires syncing `backend/src/models/User.js`, `backend/src/routes/auth.js`, `frontend/src/pages/UserHomePage.jsx`, `frontend/src/components/BlogComment.jsx`

### Blog likes are anonymous counters

Back end keeps a per-post counter. Front end deduplicates via `localStorage` (`LIKED_POSTS_KEY`). They are **not** per-user relational data.

### Seed identities & agents

`conf/backend/identities/` seeds identity records into MongoDB on startup **only if missing**. Modifying a seed file does **not** update existing DB records.

### File upload paths are platform-aware

- Linux (Docker): `/app/files/`
- Windows: `%APPDATA%/xntech/images/`
- Served with immutable cache headers via `GET /api/files/:id`

### CSS gotcha

Tailwind `backdrop-blur-lg` on the header creates a containing block. Any `position: fixed` dialog/card must be rendered **outside** the header element, or it will be clipped.

### No hardcoded secrets

`CHAT_AUTH_SECRET` must come from environment. Do not add fallback secrets, boot-time random secrets, or default admin credentials.

## Auth token format

HMAC-SHA256: `base64url(payload).base64url(signature)`. Payload: `{ username, exp }`. Middleware checks token blacklist and sets `req.user` (incl. permissions array, userGroup). RBAC via `requirePermission('resource:action')`.

## Docker deployment order

```bash
# 1. Build frontend first (Nginx needs frontend/dist/)
cd frontend && npm run build

# 2. Package (if deploying to remote)
script\build.bat        # Windows
.\script\build.ps1      # PowerShell

# 3. Deploy
sh install.sh
```

Or local Docker:

```bash
docker compose -f conf/compose/docker-compose.yml up -d --build
```

## Internationalization (i18n)

- All user-facing strings go through `t()` from `useAppShell()` context (`frontend/src/contexts/AppShellContext.jsx`).
- Locales: `zh-CN`, `zh-TW`, `en-US`. Locale persisted in `localStorage` key `app_locale`.
- Never hardcode strings in components.

## API conventions

- Response envelope: `{ code, success, msg, data }`. Errors go through this envelope — keep HTTP 200 even on failures.
- See `doc/apis/API开发规范.md` and `doc/apis/API文档格式.md` for full spec + doc template.

## UI style conventions

- Use CSS variables from `--surface-*`, `--accent-*`, `--text-*`, `--danger-*`, `--warning-*`. Never hardcode hex colors in components.
- Glassmorphism + large rounded corners + fine borders. See `doc/ui/frontend_design_tokens.md` for tokens and component recipes, `doc/ui/frontend_ui_style.md` for the full style guide.

## Reference docs

- Architecture & conventions detail: `CLAUDE.md`
- Domain-specific contracts: `.github/instructions/*.md`
- API docs: `doc/apis/`
- UI style & tokens: `doc/ui/`
- Deploy docs: `doc/部署说明.md`
