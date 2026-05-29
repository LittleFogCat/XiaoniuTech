# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XiaoNiu Tech is a personal website with AI Chat, blog, user management, and permission systems. React + Vite frontend, Express + MongoDB backend, Docker Compose + Nginx deployment.

## Development Commands

```bash
cd backend && npm install && npm run dev    # Backend on :3001
cd frontend && npm install && npm run dev   # Frontend on :5173, proxies /api→:3001

# Production
cd frontend && npm run build                 # Build → frontend/dist/
docker compose -f conf/compose/docker-compose.yml up -d --build
```

Check `/health` for liveness. No test suite exists.

## Architecture

### Backend (`backend/src/`)

- **Entry**: `index.js` — Express, mounts all routes under `/api`, connects MongoDB, initializes agents/models/identities from seed files.
- **Routes**: Split by domain — `auth.js` (login/register/profile), `chat.js` (SSE streaming, chat CRUD), `blog.js` (posts/comments/likes), `upload.js` (file upload/serve), `permission.js` (admin), `statistics.js`, `seo.js`, `chatManage.js`.
- **Middleware**: `auth.js` — `requireAuth` (token verify + blacklist check), `requirePermission(perm)` (role-based access), `resolveUserFromRequest`.
- **Models**: `User` (email, nickname, avatarFileId, bio, priority, role), `BlogPost`/`BlogComment`, `Chat`, `File` (upload metadata with md5 dedup), `ChatModel`/`Agent` (config-driven), `UserGroup`/`Blacklist`, `VisitStatistic`.
- **Services**: `provider.js` (multi-provider AI streaming, OpenAI-compatible), `auth.js` (HMAC tokens, scrypt passwords), `blogStore.js` (posts CRUD, tags, stats, likes, trash), `permissionStore.js` (RBAC), `modelStore.js`/`agentStore.js`, `mail.js` (SMTP with DNS/TCP preflight), `statisticsStore.js`.
- **Config**: `models.js` — loads `conf/backend/models.json`, resolves `${ENV_VAR}` placeholders in provider config via `resolveEnvVars()`.

### Frontend (`frontend/src/`)

- **Entry**: `main.jsx` → `App.jsx` (BrowserRouter). Routes include `/`, `/chat`, `/login`, `/blog`, `/blog/post/:slug`, `/blog/:nickname`, `/blog/new`, `/blog/edit/:slug`, `/blog/manage`, `/settings`, `/games`, `/admin/*`.
- **Contexts**: `AppShellContext` — provides i18n (`t()`), theme (dark/light), locale (zh-CN/zh-TW/en-US) across all components.
- **Services**: `api.js` (chat/auth), `blogApi.js` (blog CRUD, likes, comments, user profile, file upload), `adminApi.js`.
- **Hooks**: `usePageSeo` (meta tags, JSON-LD), `useTransientScrollbar`.
- **Styling**: Tailwind CSS + `index.css` with `.md-content` styles for code blocks, links, tables, images, etc. Dark gradient theme (`#050816`). Fonts: Space Grotesk, Noto Sans SC, IBM Plex Mono.
- **Utils**: `markdown.js` — `processMarkdown()` escapes single `~` to prevent unwanted GFM strikethrough.
- **Internationalization**: See the dedicated section below (`frontend/src/contexts/AppShellContext.jsx`).

### Internationalization

- Overview: i18n is implemented centrally in `frontend/src/contexts/AppShellContext.jsx` via the `AppShellProvider`. The provider exposes `t(key, params)` for translations, `locale`/`setLocale`, `localeOptions`, and helpers `formatDate`, `formatNumber`, `formatRelativeTime`.

- Where translations live: the file contains a `DICTIONARIES` object keyed by locale codes (`zh-CN`, `zh-TW`, `en-US`). Messages use nested keys (e.g. `blog.pageTitle`, `home.heroSubtitle`).

- Using translations in code:
	- Import the hook: `import { useAppShell } from '../contexts/AppShellContext';`
	- Example: `const { t, formatNumber } = useAppShell();` then `t('blog.readCount', { count: formatNumber(123) })`.
	- Interpolation tokens use `{name}` placeholders in strings and are substituted by passing a params object to `t()`.

- Adding or changing messages:
	- Add or update keys in each locale inside `DICTIONARIES`.
	- For new locales, add an entry to `LOCALE_OPTIONS` and provide `DICTIONARIES['<code>']` with the same structure.

- Persistence & behavior:
	- Selected locale is persisted in `localStorage` key `app_locale` and `AppShellProvider` updates `document.documentElement.lang`.
	- Missing keys fall back to the default locale (`zh-CN`) then to the key string itself.

- Formatting helpers: `formatDate` and `formatNumber` use the `Intl` APIs with the active locale to produce locale-aware output.

- Best practices:
	- Avoid hardcoded strings in components; use `t()` to keep UI translatable.
	- Keep key names stable; update all locales when adding keys.
	- Consider extracting `DICTIONARIES` into separate `frontend/src/i18n/*.js` files if the translation corpus grows, and import them into the context for maintainability.

### Auth & Permissions

- Token: HMAC-SHA256 `base64url(payload).base64url(signature)`. Payload: `{ username, exp }`.
- `requireAuth` verifies token, checks blacklist, sets `req.user` (includes permissions array, userGroup).
- `requirePermission('resource:action')` checks if `req.user.permissions` contains the required permission.
- Roles: `owner`, `admin`, `member`. Groups define permission sets.

### Blog Module

- Posts identified by 16-char random hex hash (not title-derived slug). Hash never changes on edit.
- Soft-delete via `trashed`/`trashedAt` fields. Trash excludes from lists, stats, tags.
- Drafts visible only to author. Green "草稿" badge on draft posts.
- Likes tracked per-post counter, localStorage prevents double-likes client-side.
- Comments enriched with author `nickname`/`avatarUrl` from User collection.
- Markdown import: `POST /api/blog/import` accepts `{ articles }` array. Multi-file import via `importMarkdownArticles()`.

### File Upload

- `POST /api/upload` (auth-required). Multer memory storage, sharp resize (max 1024px long edge). SHA-256 hash filename. Platform-aware path: Linux `/app/files/`, Windows `{APPDATA}/xntech/images/`.
- `File` model tracks filename, originalName, path, size, mimetype, md5.
- `GET /api/files/:id` serves files with immutable cache headers.
- User avatar stored as `avatarFileId` ref. AvatarUpload component uses click-to-open modal, confirm directly persists to profile.

### Model & Agent Configuration

- `conf/backend/models.json`: each provider has `baseUrl`, `apiKey` (with `${ENV_VAR}` references resolved at runtime), `authHeader`, `models[]`. Providers: longcat, deepseek, xiaomi, zai, openrouter.
- `conf/backend/identities/`: agent markdown seed files, imported into MongoDB on startup (existing records not overwritten). Each agent has `systemPrompt` + `personaDefinition`.
- API keys configured entirely in models.json — no hardcoded provider→env mappings in code.

### Nginx

- `/api/` → `backend:3001` with `proxy_buffering off` (SSE), `proxy_read_timeout 120s`.
- `/blog` → SPA fallback to `/index.html`.
- `/blog/post/{slug}` → proxied to backend (SSR for SEO).
- `/robots.txt`, `/sitemap.xml` → proxied to backend.

## Conventions

- Backend ESM: `"type": "module"`, imports need explicit `.js` extension.
- SSE: `data:` framing, `[DONE]` termination. Nginx `proxy_buffering off` required.
- Identity/Agent seeds only import once; modifying a seed file doesn't update existing DB records.
- Guest chat limit: 10, enforced client-side. Guest mode stores chats in `localStorage`.
- `frontend/chat/` is legacy; active frontend is `frontend/`.
- Model metadata via `conf/backend/models.json`, not hardcoded. API keys use `${VAR_NAME}` env references in JSON.
- Email sent in background (fire-and-forget); registration response returns before SMTP completes.
- Nickname: alphanumeric + Chinese only, 1-32 chars, unique. Reserved: `post`, `new`, `edit`, `manage`.
- `backdrop-blur-lg` on header creates containing block — `position: fixed` dialogs must be rendered outside the header element.
- API documentation is available at `/api/docs`. See `/api/docs/README.md` for details including API docs and API deployment instructions.
- Frontend UI design documentation is available at `/doc/ui/README.md`.
