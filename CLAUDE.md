# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

Monorepo template with **four surfaces sharing one backend**:

| Surface | Code | Audience | Auth | Where it runs |
|---|---|---|---|---|
| Laravel API | `backend/` | API consumers | JWT Bearer (`auth:api`) | `127.0.0.1:8081` |
| Filament admin | (same Laravel) | Administrators | Laravel session | `127.0.0.1:8081/admin` |
| Next.js web | `frontend/` | End users | JWT (localStorage) | `127.0.0.1:3111` |
| WeChat mini program | `miniprogram/` | End users | JWT via `wx.login` | WeChat client |

All four are reverse-proxied by nginx through `paper.xingke888.com` (configured in `paper.xingke888.com.conf`, behind Cloudflare). The Laravel API + Filament admin **share `users` table but use different auth mechanisms** — logging into one does NOT log into the other.

### Auth flows (three distinct, same User model)

1. **Email/password** (web frontend) — `POST /api/auth/login` → JWT
2. **WeChat one-tap** (mini program) — `wx.login` → `POST /api/auth/wechat-login` with `{code}` → backend calls `https://api.weixin.qq.com/sns/jscode2session` → looks up or creates User by `wx_openid` (fake `wx_{openid}@wx.local` email) → JWT
3. **Filament session** (admin panel) — Laravel's session cookie, separate from JWT entirely

JWT lifetime: `JWT_TTL=4320` (3 days), `JWT_REFRESH_TTL=20160` (14 days). Refresh via `POST /api/auth/refresh`.

### Backend layout (Laravel 13, PHP 8.4)

- `routes/api.php` — all 14 routes; public `/auth/*`, protected `/posts/*` `/ai/*` `/uploads`
- `app/Http/Controllers/Api/` — `AuthController` (5 methods), `PostController` (owner-only checks via `$post->user_id !== $request->user()->id`), `AiController` (DeepSeek chat + SSE stream), `UploadController` (multipart → `storage/app/public/uploads/{userId}/{yyyymm}/{uuid}.{ext}`)
- `app/Services/DeepSeekService.php` — OpenAI-compatible client; `chat()` blocks, `chatStream()` uses cURL `WRITEFUNCTION` to parse SSE chunks. Handles both `delta.content` (final answer) and `delta.reasoning_content` (model thinking, separately tagged)
- `app/Filament/Resources/` — auto-discovered admin CRUD pages (`PostResource`, `UserResource`)
- `app/Models/User.php` — fillable includes `wx_openid`, `wx_unionid` for WeChat users
- `bootstrap/app.php` — uses Laravel 13 streamlined config; `trustProxies(at: '*')` is required so HTTPS redirects work behind Cloudflare
- `config/services.php` — `deepseek` + `wechat` blocks read AppID/secret/API key from env

### Frontend (`frontend/`, Next.js 16 + React 19.2)

- `lib/api/` — `apiClient` (auto-injects Bearer token), typed methods for `authApi`, `postsApi`, `aiApi.chat`, `aiChatStream` (fetch + ReadableStream SSE parser)
- `lib/auth-context.tsx` — `AuthProvider` + `useAuth()` hook (user, token, login, register, logout, isAuthenticated)
- `components/onboarding-chat.tsx` — full-featured chat modal mimicking WeChat UI (red gradient header, cream chat body, AI/user bubbles, font-size A/A/A, streaming AI replies via `aiChatStream`, 401 auto-logout)
- `app/page.tsx` — landing page with red CTA button that opens `<OnboardingChat>`
- `next.config.ts` — `allowedDevOrigins: ['paper.xingke888.com']` required so dev resources serve to non-localhost hosts

### Mini program (`miniprogram/`, native WXML/WXSS/JS)

**Critical constraint**: code is ES5-style (no `async/await`, `const`/`let`, arrow funcs, destructuring) to avoid WeChat DevTools triggering `@babel/runtime` transpile (which breaks module registration). When editing, keep `function`/`var`/Promise chains; **never introduce ES6+ syntax** unless you also re-enable npm-based babel runtime.

- `app.js` — `globalData: { apiBaseUrl, token, user }`; loads token from `wx.getStorageSync` on launch
- `utils/request.js` — `wx.request` wrapper with auto Authorization injection, 401 triggers re-login via `wx.login`
- `utils/api.js` — `wechatLogin`, `aiChat`, `aiChatStream` (uses `wx.request enableChunked + onChunkReceived`, falls back if base lib < 2.20.2), `uploadFile`
- `pages/chat/chat.{wxml,wxss,js,json}` — single-page chat replicating Web `OnboardingChat`:
  - Markdown rendered as **wxml blocks** (not rich-text) — lists use flex layout with computed `markerWidth` so numbered items align even with 1./10. mixed; bold/italic/code uses small inline `<rich-text>`
  - Streaming AI replies throttled to 50ms per `setData` to spare low-end Android
  - Inline SVG icons (Feather Icons style, encoded as `data:image/svg+xml;utf8,...`) stored in `data.icons` for the +/mic/camera/album/file/bot avatar
  - Media bubble types: `image` (uses local `tempPath` first to avoid downloadFile domain whitelist), `file`, `voice` (recorded via `wx.getRecorderManager`)
  - `scroll-view` for messages must have **explicit pixel height** via `style="height: {{msgsHeight}}px"`; `flex:1` alone breaks scrolling on real device. `_recomputeMsgsHeight()` uses `SelectorQuery` after layout
- `project.config.json` AppID: `wx81855e163e189a51`; `setting.es6: false` and `enhance: false` keep JS pass-through

### Production deployment

| File | Role |
|---|---|
| `ecosystem.config.js` | PM2 spec: `clawcn-template-backend` runs `php8.4 artisan serve --host=127.0.0.1 --port=8081`; `clawcn-template-frontend` runs `./node_modules/.bin/next dev -p 3111 -H 127.0.0.1` |
| `paper.xingke888.com.conf` | nginx: terminates HTTPS, proxies `/api`, `/admin/*` to 8081, everything else to 3111. **`/api/ai/chat-stream` has `proxy_buffering off; proxy_cache off; proxy_read_timeout 300s`** for SSE |
| `/etc/nginx/sites-enabled/paper.xingke888.com` | symlink to deployed copy of the conf above |
| Cloudflare | terminates TLS for browsers; **must enable WebSockets in Network settings** for Next.js dev HMR to work |

### Required env (`backend/.env`)

```
APP_URL=https://paper.xingke888.com
FRONTEND_URL=https://paper.xingke888.com
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_DATABASE=clawdb
DB_USERNAME=<rotate-able role, NOT clawcn>   # see Security Notes below
DB_PASSWORD=<rotate-able>
JWT_SECRET=<php artisan jwt:secret>
JWT_TTL=4320            # access token lifetime (minutes) = 3 days
JWT_REFRESH_TTL=20160   # refresh window (minutes) = 14 days
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-v4-flash  # or deepseek-v4-pro (slower, smarter; both are reasoning models — keep max_tokens >= 500)
DEEPSEEK_BASE_URL=https://api.deepseek.com
WECHAT_APPID=wx81855e163e189a51
WECHAT_APPSECRET=<from mp.weixin.qq.com>
```

`frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=https://paper.xingke888.com/api
```

## Development Commands

### Backend
```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8081     # dev (PM2 runs this in prod)
php artisan migrate                                  # apply migrations
php artisan db:seed                                  # demo user: demo@example.com / password
php artisan test                                     # Pest tests
php artisan test --filter=testName                   # single test
php artisan route:list                               # see all routes
php artisan tinker                                   # REPL
php artisan jwt:secret                               # regenerate JWT secret
php artisan storage:link                             # required for /storage/uploads URLs
vendor/bin/pint --dirty                              # PHP formatter (run before commit)
```

### Frontend
```bash
cd frontend
npm run dev                                          # localhost:3111
npm run build && npm start                           # production
npm run lint                                         # ESLint
npx tsc --noEmit                                     # type-check only
npx shadcn@latest add [component]                    # add UI component
```

### Mini program
Open `miniprogram/` in WeChat DevTools. AppID is pre-filled in `project.config.json`. For local development, `project.private.config.json` disables `urlCheck` so requests to `paper.xingke888.com` work. **Before real-device preview**: add `https://paper.xingke888.com` to all four whitelists in mp.weixin.qq.com → 开发管理 → 服务器域名 (`request`, `uploadFile`, `downloadFile`, `socket` not needed).

### PM2 (production processes)
```bash
pm2 start ecosystem.config.js
pm2 list
pm2 restart clawcn-template-backend
pm2 logs clawcn-template-frontend --lines 50
pm2 save                                             # persist process list across reboots
```

## Patterns to follow when extending

### Adding a new API endpoint
1. Controller method in `backend/app/Http/Controllers/Api/`
2. Route in `backend/routes/api.php` (inside `auth:api` group if protected)
3. `php artisan route:cache` + `pm2 restart clawcn-template-backend`
4. Frontend: TypeScript types in `frontend/lib/api/types.ts`, method in `frontend/lib/api/*.ts`, re-export in `frontend/lib/api/index.ts`
5. Mini program: method in `miniprogram/utils/api.js` using `request()` helper

### Adding a Filament resource
```bash
cd backend
php artisan make:filament-resource Example
```
Auto-discovered from `app/Filament/Resources/`. For production, gate access via `User::canAccessPanel(Panel $panel)` (currently any authenticated user can sign in).

### Calling DeepSeek
- Blocking: `DeepSeekService::chat([{role,content},...], $opts)` returns full string
- Streaming: `chatStream($messages, $opts, function($delta, $kind) { ... })` — `$kind` is `'content'` or `'reasoning'`; controller emits SSE to client
- Both deepseek-v4-pro and deepseek-v4-flash are **reasoning models** — they use `delta.reasoning_content` for thinking before `delta.content` arrives. Keep `max_tokens >= 500` or reasoning eats the budget and `content` comes back empty.

### Mini program scroll-view layout
Always set explicit pixel height via `style="height: {{px}}px"`. `flex:1` does not reliably size scroll-view on real device. After any state change that affects bottom-panel height (login/voice/plus menu), call `_recomputeMsgsHeight()` via `wx.nextTick`.

### Mini program ES5-only
Adding `async/await` or `const`/`let` anywhere in `miniprogram/**/*.js` will silently disable that file's module registration (you get `module 'utils/api.js' is not defined`). Use `function` declarations, `var`, and Promise chains.

## Security notes

The DB role originally named `clawcn` was repeatedly compromised by an in-host attacker (cryptominer + brute-force PG). Current `.env` uses a randomly-named role (`clawapp_*`) so the attacker still pounding `clawcn` doesn't affect the app. If you create a new role, give it `GRANT ALL ON SCHEMA public ... ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO new_user` so future tables work.

If the app suddenly returns `SQLSTATE[08006] ... password authentication failed for user "clawapp_*"` again:
```bash
cd /home/ubuntu/clawcn-template/backend
PASS=$(grep "^DB_PASSWORD=" .env | cut -d= -f2-)
USER=$(grep "^DB_USERNAME=" .env | cut -d= -f2-)
sudo -u postgres psql -c "ALTER ROLE $USER WITH PASSWORD '$PASS';"
pm2 restart clawcn-template-backend
```

## Technology versions

- Laravel 13.8.0, PHP 8.4.1, Filament 5.6, JWT-Auth 2.9, Pest 4.4.5
- Next.js 16.2.6, React 19.2.6, TypeScript 5, Tailwind CSS 4
- WeChat 基础库 ≥ 2.20.2 (required for `enableChunked` SSE in mini program)
- PostgreSQL 16
- DeepSeek API (`deepseek-v4-pro` / `deepseek-v4-flash` reasoning models)
