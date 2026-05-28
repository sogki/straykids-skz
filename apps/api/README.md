# @skz/api

Small Express service for **player Discord OAuth** (separate from admin `/panel` codes and Supabase Auth).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/player/auth/discord` | Redirect to Discord authorize |
| GET | `/api/player/auth/discord/callback` | OAuth callback → player session → redirect to site |
| GET | `/health` | Health check |

## Configuration (database-first)

All of this lives in **`skz_bot_settings`**, edited under **Admin → Discord bot → Credentials**:

| Key | Purpose |
|-----|---------|
| `site_url` | Public origin, e.g. `https://skzarcade.com` (no trailing slash) |
| `discord_client_id` | Discord application ID |
| `discord_client_secret` | OAuth2 client secret |
| `supabase_url` / `supabase_service_role_key` | Database access |

OAuth redirect URI is derived automatically:

`{site_url}/api/player/auth/discord/callback`

Add that exact URL in **Discord Developer Portal → OAuth2 → Redirects**.

### Optional env overrides (`apps/api/.env`)

Only needed for local bootstrap or dev overrides:

| Variable | Purpose |
|----------|---------|
| `SKZ_BOOTSTRAP_SUPABASE_*` | Read Supabase + bot settings from DB on first boot |
| `SITE_URL` | Overrides `site_url` from DB when testing locally |
| `DISCORD_OAUTH_REDIRECT_URI` | Overrides derived redirect URI |
| `API_PORT` | Default `8787` |

The **bot** and **web** apps do **not** need `SITE_URL` in their env for player OAuth.

## Discord Developer Portal

Add redirect URLs for each environment, e.g.:

- `https://skzarcade.com/api/player/auth/discord/callback`
- `http://localhost:5173/api/player/auth/discord/callback` (local — set **Site URL** to `http://localhost:5173` in admin while testing)

## Local dev

1. Apply migrations (including `20260528000027_skz_bot_site_url_setting.sql`).
2. In admin **Credentials**, set **Site URL** to `http://localhost:5173` and save.
3. Run API + web:

```bash
npm run dev:api
npm run dev:web
```

4. Open `http://localhost:5173/link` → **Continue with Discord**.

For local testing, set **Site URL** in admin to `http://localhost:5173` (not production). Change it back before going live.

## Production

### Production (Vercel)

The web app ships **serverless handlers** under `apps/web/api/player/` that reuse `@skz/api` OAuth logic. No separate API host is required.

Set these in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you test there):

| Variable | Value |
|----------|--------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` (from Supabase → Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` secret (not the anon key) |

Redeploy after saving. Without these, `/api/player/auth/discord` returns **500 FUNCTION_INVOCATION_FAILED**.

Optional aliases: `SKZ_BOOTSTRAP_SUPABASE_URL` + `SKZ_BOOTSTRAP_SUPABASE_SERVICE_ROLE_KEY` (same values).

Discord client id/secret and `site_url` are still read from **`skz_bot_settings`** once Supabase connects.

Ensure **Site URL** and **Discord client secret** are set in Admin → Discord bot → Credentials.

### Local dev

`dev:api` loads env from **`apps/api/.env`**, then **`apps/bot/.env`**, then **`apps/web/.env`** (in that order; first value wins). You need the **service role** key — the web app’s `VITE_SUPABASE_ANON_KEY` is not enough.

If the bot already has `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `apps/bot/.env`, `npm run dev:api` should work with no extra file.

```bash
npm run dev:arcade
```

Runs the Vite site and Express API together. The web dev server proxies `/api/player/*` to port **8787** when using `dev:web` + `dev:api` separately.

Player sessions use `p_` tokens — never admin session keys.
