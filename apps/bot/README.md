# @skz/bot

The SKZ Arcade Discord bot. Built with [discord.js](https://discord.js.org/) v14 and TypeScript.

## Features

- **Verify on react** — embed panels with reaction/button role grants
- **Reaction roles** — pronouns, colors, etc. (managed in Admin → Discord bot)
- **Join to create** — personal voice channels from a hub VC
- **DB-backed config** — credentials + settings in `skz_bot_settings` (admin panel)

## First-time setup

1. Apply Supabase migrations `20260528000001` through `20260528000004`.
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

The bot uses **Guilds**, **GuildMessageReactions**, and **GuildVoiceStates** only (no privileged intents). If you see `Used disallowed intents`, remove any extra intents you added in code or enable them in the [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Privileged Gateway Intents.

## Commands

- `/ping` — latency check
- `/reload` — reload DB config, sync channel/role dropdown cache, process deploy queue

## Deploy queue

Admin actions **Sync Discord dropdowns** and **Publish** write to `skz_bot_outbox`. The bot processes jobs immediately via Supabase Realtime (with a 2s poll fallback) and also on `/reload`.

## Railway

Root directory: `apps/bot`. Optional env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` for bootstrap. All Discord secrets from the admin panel / DB.
