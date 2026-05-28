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

## Deploy queue

Admin actions **Sync Discord dropdowns** and **Publish** write to `skz_bot_outbox`. The bot processes jobs immediately via Supabase Realtime (with a 2s poll fallback) and also on `/reload`.

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
