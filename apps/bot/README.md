# @skz/bot

The SKZ Arcade Discord bot. Built with [discord.js](https://discord.js.org/) v14 and TypeScript.

## Features

- **Verify on react** — embed panels with reaction/button role grants
- **Reaction roles** — pronouns, colors, etc. (managed in Admin → Discord bot)
- **Join to create** — personal voice channels from a hub VC
- **DB-backed config** — credentials + settings in `skz_bot_settings` (admin panel)
- **Moderation logs** — customizable embed templates (admin panel), member join / account info, message edit & delete (single + bulk), `/info` for mods

## First-time setup

1. Apply Supabase migrations `20260528000001` through `20260528000022`.
2. **Bootstrap Supabase** (one-time): set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `apps/bot/.env` *or* insert them into `skz_bot_settings` via SQL.
3. Open **Admin → Discord bot → Credentials** and save:
   - `discord_token`
   - `discord_client_id`
   - `supabase_url` + `supabase_service_role_key` (if not already in DB)
4. Set **Guild ID**, create embed panels, add reaction options, click **Deploy to Discord**.
5. Register slash commands: `npm run register --workspace=@skz/bot`
6. Run: `npm run dev:bot`

Discord token and Supabase service role **do not belong in `.env` long-term** — the admin panel is the source of truth. `.env` bootstrap is only to reach the database the first time.

## Intents

The bot requests **Guilds**, **GuildMembers**, **GuildMessages**, **MessageContent**, **GuildMessageReactions**, and **GuildVoiceStates**.

Enable **Server Members Intent** and **Message Content Intent** in the [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Privileged Gateway Intents (required for moderation logging and reliable edit/delete content).

## Commands

- `/reload` — reload DB config, sync channel/role dropdown cache, process deploy queue
- `/info [user]` — detailed account lookup (Discord roles mapped as **moderator** or **full admin** only)

**Global commands** (DM or any server):

- `/leaderboard [days]` — top players by daily puzzle points

Player sign-in uses **Discord OAuth** on the website (`Continue with Discord`). The OAuth HTTP routes run **in this bot process** (`/api/player/*`), reading `discord_client_secret`, `site_url`, etc. from `skz_bot_settings` — there is no separate `apps/api` package.

## Deploy queue

Admin actions **Sync Discord dropdowns** and **Publish** write to `skz_bot_outbox`. The bot processes jobs immediately via Supabase Realtime (with a 2s poll fallback) and also on `/reload`.

## Player OAuth HTTP

When the bot starts, it also listens on `PORT` (Railway sets this automatically; local default **8787**):

| Route | Purpose |
| ----- | ------- |
| `GET /api/player/health` | Smoke test |
| `GET /api/player/auth/discord` | Start OAuth |
| `GET /api/player/auth/discord/callback` | Discord redirect |
| `GET /api/player/auth/debug` | Config check (no secrets) |

**Local:** `npm run dev:web` proxies `/api/player` → `http://127.0.0.1:8787` while `npm run dev:bot` is running.

**Production (Vercel + Railway):** the static site proxies `/api/player/*` to the bot. In **Vercel → Environment Variables** set:

- `SKZ_BOT_HTTP_ORIGIN` = your Railway **public** URL, e.g. `https://skz-bot-production.up.railway.app` (no trailing slash)

Enable **Public networking** on Railway so the bot HTTP port is reachable.

**Port must match:** In Railway → Networking, if the public port is **8787**, set a service variable `PORT=8787` (or let Railway inject `PORT` automatically when you pick that port). The process listens on `process.env.PORT`. If Railway shows “Application failed to respond”, the deploy logs should still show `player OAuth HTTP listening on 0.0.0.0:…` — if that line is missing, the container exited during startup (check Supabase bootstrap + Discord token).

Admin must have **Site URL**, **Discord client secret** (OAuth2 → Client secret — paste into Credentials and **Save settings**; it is masked in DB), and Discord redirect  
`{site_url}/api/player/auth/discord/callback`.

Optional Railway fallback: `DISCORD_CLIENT_SECRET` (same value as in the Discord Developer Portal).

## Railway

Root directory: `apps/bot`.

**Required env vars** (even if the same values are already in `skz_bot_settings`):

| Variable | Purpose |
| -------- | ------- |
| `SUPABASE_URL` | Bootstrap connect — then DB row can take over |
| `SUPABASE_SERVICE_ROLE_KEY` | Bootstrap connect — then DB row can take over |

The bot cannot read the database on first boot without these. Copy them from Supabase → Project Settings → API (service_role key, not anon).

Discord token / client ID stay in `skz_bot_settings` only (Admin → Credentials). Do not commit `.env` to git.

## Owner full admin (by Discord user ID)

Apply migration `20260528000020`. Then either:

1. **Admin → Discord bot → Role permissions → Owner accounts** (requires an existing full-admin session + staff code), or
2. **Supabase SQL** (first-time bootstrap):

```sql
INSERT INTO skz_admin_discord_user_permissions (discord_user_id, label)
VALUES ('YOUR_DISCORD_USER_ID', 'Owner')
ON CONFLICT (discord_user_id) DO UPDATE SET is_active = true, label = EXCLUDED.label;
```

Enable **Developer Mode** in Discord → right-click your profile → **Copy User ID**. Owner rows always receive `full_admin` regardless of Stay Café roles; moderators cannot edit this table from the panel.

The `ws` package is required on Node 20 (Railway) so Supabase Realtime can connect for the deploy outbox.
