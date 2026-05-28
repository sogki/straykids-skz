# SKZ Arcade

Stray Kids fan minigame site + Discord bot. npm-workspace monorepo orchestrated with [Turborepo](https://turborepo.com).

```
straykids-skz/
├── apps/
│   ├── web/        ← Vite + React 19 + Tailwind 4. The skzarcade.com site.
│   └── bot/        ← Discord bot. discord.js v14 + TypeScript. Runs on Railway.
├── packages/
│   └── shared/     ← Pure game logic shared by web and bot (no DOM, no React).
├── docs/
├── supabase/       ← Database migrations (shared by web and bot).
└── turbo.json
```

## Quick start

```bash
# install everything (one shot from the root)
npm install

# run the web app
npm run dev:web        # http://localhost:5173

# web + player Discord OAuth API (needed for "Connect with Discord")
npm run dev:arcade     # web on :5173, API on :8787

# run the bot (needs apps/bot/.env)
npm run dev:bot

# build everything
npm run build
```

## Apps

- **[`apps/web`](apps/web)** — the existing site. Same code as before, just moved into the workspace. See `apps/web/README.md` for the Supabase setup it inherits from the old root README (now archived below).
- **[`apps/bot`](apps/bot)** — the Discord bot (`/reload`, `/panel`, `/info`, etc.). See its README for Railway deployment and how to add commands.

## Packages

- **[`packages/shared`](packages/shared)** — pure JS helpers (`normalizeAnswer`, `isAnswerCorrect`, `getTodayKey`, `pickDailyPuzzle`) so the bot and the web treat puzzles identically.

## Deployment

- **Web → Vercel**: set the project's *Root Directory* to `apps/web`. The build command stays as the default. Vercel auto-detects npm workspaces and hoists deps at the repo root.
- **Bot → Railway**: set the project's *Root Directory* to `apps/bot`. Add env vars from `apps/bot/.env.example` in the Railway dashboard. See `apps/bot/README.md`.

## Web app — Supabase setup

The web's existing setup hasn't changed; the `.env` just moved from the repo root to `apps/web/.env`.

### 1. Create `apps/web/.env`

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Vite only reads `.env` at startup. Use the `VITE_` prefix — other names are not exposed to the browser.

### 2. Run database migrations

Apply SQL in `supabase/migrations/` on your Supabase project (see `supabase/README.md`).

### 3. Hero image (`skz_settings`)

In the Supabase table editor, set `skz_settings → hero_image_url`:

| Value type    | Example                                                                          |
| ------------- | -------------------------------------------------------------------------------- |
| Full URL      | `https://kprofiles.com/wp-content/uploads/2017/11/Stray-Kids-3-900x600.jpeg`     |
| Storage path  | `hero/banner.jpg` (file must be in public bucket `skz_arcade`)                   |

Optional `.env` override: `VITE_HERO_IMAGE_URL=https://your-cdn.com/hero.jpg`

### Service role key

Store `supabase_service_role_key` in `skz_settings` with `is_public = false`. Never put the service role in `apps/web/.env` — that file gets bundled into the browser. The bot can use the service role from `apps/bot/.env` because that runs server-side.
