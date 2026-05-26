# SKZ Arcade — Supabase (sogki.dev)

Run these migrations on your **existing** sogki.dev Supabase project.

## Tables (all `skz_` prefixed)

| Table | Purpose |
|-------|---------|
| `skz_settings` | URLs, anon key, hero image, feature flags. `is_public` controls browser access. |
| `skz_games` | Arcade game list |
| `skz_daily_songs` | Song puzzle pool |
| `skz_daily_members` | Member puzzle pool |
| `skz_daily_lyrics` | Lyric puzzle pool |
| `skz_daily_schedule` | Optional pinned song per date |
| `skz_daily_member_schedule` | Optional pinned member per date |
| `skz_daily_lyric_schedule` | Optional pinned lyric per date |
| `skz_quiz_members` | Bias quiz results |
| `skz_quiz_questions` | Bias quiz questions |
| `skz_profiles` | Optional cloud profile saves |
| `skz_admin_staff` | Single-row staff code for admin dashboard (edit only in Supabase) |
| `skz_analytics_events` | Page views & game events (insert via RPC) |

## Apply migrations

```bash
# From sogki Supabase project root, or link this repo:
supabase db push
# Or paste SQL from supabase/migrations/ into the SQL editor
```

## Configure the app

1. **Create `.env`** in the project root (see `.env.example`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Restart `npm run dev` after changes.

2. Update `skz_settings` in the dashboard (content, not required for connection):
   - `hero_image_url` — full URL or `skz_arcade` path (e.g. `hero/banner.jpg`)
   - `supabase_service_role_key` — **is_public = false** (server/admin only)
   - Optional: `supabase_url` / `supabase_anon_key` rows if you want credentials duplicated in DB

3. Optional fallback: `public/skz-connect.json` (same values as `.env`).

## Security

- **Browser**: only reads `skz_settings` where `is_public = true` via `skz_get_public_config()` RPC.
- **Service role key**: stored in `skz_settings` for sogki admin / Edge Functions — never returned by the RPC and blocked by RLS for `anon`.

## Managing content

- Seed all daily puzzles: paste **`supabase/seed/daily_puzzles_complete.sql`** in the SQL Editor (tables + all rows in one file), or run migrations `20250526000010` then `20250526000011`
- Regenerate seed after editing JS pools: `npm run generate:daily-seed`
- Add songs: insert into `skz_daily_songs` (or edit `src/data/dailySongs.js` and regenerate)
- Pin a date: insert into `skz_daily_schedule` (`puzzle_date`, `song_id`)
- Edit games: `skz_games` table
- Change hero: `skz_settings` key `hero_image_url` (full URL or bucket path like `hero/banner.jpg`)
- Upload images to Storage bucket `skz_arcade` (public). Set `storage_bucket` in settings if you rename it.

### Hero not updating?

Settings are fetched fresh from the DB on each page load (credentials only are cached). After changing `hero_image_url`, hard-refresh the browser. Old `skz_public_config_v1` localStorage is cleared automatically.

## Admin dashboard

1. Run migration `20250525000004_skz_admin_analytics.sql`.
2. Set your staff code in Supabase → **Table Editor** → `skz_admin_staff` → row `id = 1` → `staff_code` (default seed is `CHANGE_ME_IN_SUPABASE`).
3. Open **`/admin/login`** in the app, sign in with that code.
4. **Site banner**: enable message/link at `/admin/banner` (public keys `site_banner_*`).
5. **Analytics**: counts come from `skz_analytics_events` (page views on route change, game starts/completes on play).

Staff code is **not** stored in `.env` and cannot be changed from the dashboard — only via the `skz_admin_staff` table.

## Global leaderboard (arcade hub)

Migration `20250525000005_skz_leaderboard.sql` adds `country_code` to analytics and RPC `skz_get_public_leaderboard`.

- **Wins**: daily song guesses marked `won` (by visitor country from browser locale/timezone).
- **Finish rate**: % of game sessions that reach `game_complete` vs `game_start` per country.
- Shown on the home arcade section; top 10 countries with at least one win.
