-- SKZ Arcade schema for sogki.dev shared Supabase project
-- All tables prefixed with skz_

-- ─────────────────────────────────────────────
-- Settings (keys, URLs, feature flags)
-- is_public = true  → readable by anon (browser-safe)
-- is_public = false → server / service role only (never expose to client)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skz_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL UNIQUE,
  value         text NOT NULL,
  is_public     boolean NOT NULL DEFAULT false,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skz_settings_public_idx ON skz_settings (is_public) WHERE is_public = true;

-- ─────────────────────────────────────────────
-- Games registry (arcade cabinet list)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skz_games (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,
  description   text NOT NULL,
  emoji         text NOT NULL DEFAULT '🎮',
  path          text NOT NULL,
  color         text NOT NULL DEFAULT '#a855f7',
  tag           text,
  image_url     text,
  sort_order    int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Daily song puzzle pool
-- reveals: JSON array [{ type, label, content }, ...]
-- answers: JSON array of accepted strings
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skz_daily_songs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  answers       jsonb NOT NULL DEFAULT '[]',
  reveals       jsonb NOT NULL DEFAULT '[]',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Optional: pin a specific song to a calendar date (overrides hash pick)
CREATE TABLE IF NOT EXISTS skz_daily_schedule (
  puzzle_date   date PRIMARY KEY,
  song_id       uuid NOT NULL REFERENCES skz_daily_songs (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Bias quiz
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skz_quiz_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  emoji         text NOT NULL,
  color         text NOT NULL,
  description   text NOT NULL,
  sort_order    int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skz_quiz_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order    int NOT NULL DEFAULT 0,
  question      text NOT NULL,
  options       jsonb NOT NULL DEFAULT '[]',
  is_active     boolean NOT NULL DEFAULT true
);

-- ─────────────────────────────────────────────
-- Fan profiles (optional cloud save)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skz_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       text NOT NULL,
  stay_name       text,
  bias            text,
  favourite_song  text,
  favourite_era   text,
  favourite_colour text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id)
);

-- ─────────────────────────────────────────────
-- Updated_at trigger
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION skz_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER skz_settings_updated_at
  BEFORE UPDATE ON skz_settings
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();

CREATE TRIGGER skz_games_updated_at
  BEFORE UPDATE ON skz_games
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();

CREATE TRIGGER skz_daily_songs_updated_at
  BEFORE UPDATE ON skz_daily_songs
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();

-- ─────────────────────────────────────────────
-- Public config RPC (anon-safe, no secrets)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION skz_get_public_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_object_agg(key, value),
    '{}'::jsonb
  )
  FROM skz_settings
  WHERE is_public = true;
$$;

GRANT EXECUTE ON FUNCTION skz_get_public_config() TO anon, authenticated;

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
ALTER TABLE skz_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_daily_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_daily_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_quiz_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_profiles ENABLE ROW LEVEL SECURITY;

-- Settings: only public keys visible to anon
CREATE POLICY skz_settings_public_read ON skz_settings
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

-- Service role manages all settings (dashboard / sogki admin)
CREATE POLICY skz_settings_service_all ON skz_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY skz_games_public_read ON skz_games
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY skz_games_service_all ON skz_games
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY skz_daily_songs_public_read ON skz_daily_songs
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY skz_daily_songs_service_all ON skz_daily_songs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY skz_daily_schedule_public_read ON skz_daily_schedule
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY skz_daily_schedule_service_all ON skz_daily_schedule
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY skz_quiz_members_public_read ON skz_quiz_members
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY skz_quiz_members_service_all ON skz_quiz_members
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY skz_quiz_questions_public_read ON skz_quiz_questions
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY skz_quiz_questions_service_all ON skz_quiz_questions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY skz_profiles_anon_upsert ON skz_profiles
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
