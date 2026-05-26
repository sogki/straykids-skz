# SKZ Arcade

Stray Kids fan minigame site powered by Supabase.

## Connect to Supabase (required)

### 1. Create `.env` in the project root

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env` with your **sogki** Supabase project values from  
**Dashboard → Project Settings → API**:

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Restart the dev server after saving:

```bash
npm run dev
```

> **Important:** Vite only reads `.env` at startup. Use the `VITE_` prefix — other names are not exposed to the browser.

### 2. Run database migrations

Apply SQL in `supabase/migrations/` on your Supabase project (see `supabase/README.md`).

### 3. Hero image (`skz_settings`)

In the Supabase table editor, set `skz_settings` → `hero_image_url`:

| Value type | Example |
|------------|---------|
| Full URL | `https://kprofiles.com/wp-content/uploads/2017/11/Stray-Kids-3-900x600.jpeg` |
| Storage path | `hero/banner.jpg` (file must be in public bucket `skz_arcade`) |

Optional override in `.env`:

```env
VITE_HERO_IMAGE_URL=https://your-cdn.com/hero.jpg
```

### Fallback: `public/skz-connect.json`

If you skip `.env`, you can put the same URL and anon key in `public/skz-connect.json`. **`.env` is recommended.**

### Service role key

Store `supabase_service_role_key` in `skz_settings` with **`is_public = false`**.  
Never put the service role in `.env` for this frontend app.

## Run

```bash
npm install
npm run dev
```

## Config flow

```
.env (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
    → Supabase client
    → skz_settings, skz_games, skz_daily_songs, …
```

Content (hero, games, songs) lives in the database — not in `.env`, except optional `VITE_HERO_IMAGE_URL`.
