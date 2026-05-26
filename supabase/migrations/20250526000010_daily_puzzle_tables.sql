-- Daily Member + Lyric puzzle pools (Song pool already exists in 000001)

-- ── Daily member puzzle pool ──
CREATE TABLE IF NOT EXISTS skz_daily_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  question_type   text NOT NULL DEFAULT 'trivia',
  prompt          text NOT NULL DEFAULT '',
  display_answer  text NOT NULL,
  answers         jsonb NOT NULL DEFAULT '[]',
  reveals         jsonb NOT NULL DEFAULT '[]',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Daily lyric puzzle pool ──
CREATE TABLE IF NOT EXISTS skz_daily_lyrics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  song            text NOT NULL,
  display_answer  text NOT NULL,
  answers         jsonb NOT NULL DEFAULT '[]',
  reveals         jsonb NOT NULL DEFAULT '[]',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Optional: pin a member or lyric to a calendar date
CREATE TABLE IF NOT EXISTS skz_daily_member_schedule (
  puzzle_date   date PRIMARY KEY,
  member_id     uuid NOT NULL REFERENCES skz_daily_members (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skz_daily_lyric_schedule (
  puzzle_date   date PRIMARY KEY,
  lyric_id      uuid NOT NULL REFERENCES skz_daily_lyrics (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS skz_daily_members_updated_at ON skz_daily_members;
CREATE TRIGGER skz_daily_members_updated_at
  BEFORE UPDATE ON skz_daily_members
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();

DROP TRIGGER IF EXISTS skz_daily_lyrics_updated_at ON skz_daily_lyrics;
CREATE TRIGGER skz_daily_lyrics_updated_at
  BEFORE UPDATE ON skz_daily_lyrics
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();

-- RLS
ALTER TABLE skz_daily_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_daily_lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_daily_member_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_daily_lyric_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skz_daily_members_public_read ON skz_daily_members;
CREATE POLICY skz_daily_members_public_read ON skz_daily_members
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS skz_daily_members_service_all ON skz_daily_members;
CREATE POLICY skz_daily_members_service_all ON skz_daily_members
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS skz_daily_lyrics_public_read ON skz_daily_lyrics;
CREATE POLICY skz_daily_lyrics_public_read ON skz_daily_lyrics
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS skz_daily_lyrics_service_all ON skz_daily_lyrics;
CREATE POLICY skz_daily_lyrics_service_all ON skz_daily_lyrics
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS skz_daily_member_schedule_public_read ON skz_daily_member_schedule;
CREATE POLICY skz_daily_member_schedule_public_read ON skz_daily_member_schedule
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS skz_daily_member_schedule_service_all ON skz_daily_member_schedule;
CREATE POLICY skz_daily_member_schedule_service_all ON skz_daily_member_schedule
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS skz_daily_lyric_schedule_public_read ON skz_daily_lyric_schedule;
CREATE POLICY skz_daily_lyric_schedule_public_read ON skz_daily_lyric_schedule
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS skz_daily_lyric_schedule_service_all ON skz_daily_lyric_schedule;
CREATE POLICY skz_daily_lyric_schedule_service_all ON skz_daily_lyric_schedule
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
