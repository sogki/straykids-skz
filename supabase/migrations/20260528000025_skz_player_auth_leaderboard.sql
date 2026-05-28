-- Player arcade auth (bot-issued codes, separate from skz_admin_* tables).
-- Global leaderboard: 1 point per correct daily guess (one claim per game + puzzle date).

-- ── Bot login codes (any Discord user; no admin permissions) ──
CREATE TABLE IF NOT EXISTS skz_player_discord_login_codes (
  login_code     text PRIMARY KEY,
  discord_user_id text NOT NULL,
  username       text NOT NULL DEFAULT '',
  global_name    text,
  avatar_hash    text,
  guild_id       text,
  expires_at     timestamptz NOT NULL,
  used_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skz_player_discord_login_codes_user_idx
  ON skz_player_discord_login_codes (discord_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS skz_player_web_sessions (
  session_token   text PRIMARY KEY,
  discord_user_id text NOT NULL,
  username        text NOT NULL DEFAULT '',
  global_name     text,
  avatar_hash     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  revoked_at      timestamptz
);

CREATE INDEX IF NOT EXISTS skz_player_web_sessions_user_idx
  ON skz_player_web_sessions (discord_user_id, created_at DESC);

ALTER TABLE skz_player_discord_login_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_player_web_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skz_player_discord_login_codes_service ON skz_player_discord_login_codes;
CREATE POLICY skz_player_discord_login_codes_service ON skz_player_discord_login_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS skz_player_web_sessions_service ON skz_player_web_sessions;
CREATE POLICY skz_player_web_sessions_service ON skz_player_web_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Profile snapshot for leaderboard display (updated on each link / session exchange)
CREATE TABLE IF NOT EXISTS skz_player_profiles (
  discord_user_id text PRIMARY KEY,
  username        text NOT NULL DEFAULT '',
  global_name     text,
  avatar_hash     text,
  show_on_board   boolean NOT NULL DEFAULT true,
  linked_at       timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS skz_player_profiles_updated_at ON skz_player_profiles;
CREATE TRIGGER skz_player_profiles_updated_at
  BEFORE UPDATE ON skz_player_profiles
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();

ALTER TABLE skz_player_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skz_player_profiles_service ON skz_player_profiles;
CREATE POLICY skz_player_profiles_service ON skz_player_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- One row per player per daily game per calendar puzzle date
CREATE TABLE IF NOT EXISTS skz_player_daily_points (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_user_id text NOT NULL REFERENCES skz_player_profiles (discord_user_id) ON DELETE CASCADE,
  game_slug       text NOT NULL,
  puzzle_date     date NOT NULL,
  points          int NOT NULL DEFAULT 0 CHECK (points >= 0),
  correct_guesses int NOT NULL DEFAULT 0 CHECK (correct_guesses >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (discord_user_id, game_slug, puzzle_date)
);

CREATE INDEX IF NOT EXISTS skz_player_daily_points_board_idx
  ON skz_player_daily_points (puzzle_date DESC, game_slug);

CREATE INDEX IF NOT EXISTS skz_player_daily_points_user_idx
  ON skz_player_daily_points (discord_user_id, puzzle_date DESC);

ALTER TABLE skz_player_daily_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skz_player_daily_points_service ON skz_player_daily_points;
CREATE POLICY skz_player_daily_points_service ON skz_player_daily_points
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Daily arcade games that award leaderboard points
CREATE OR REPLACE FUNCTION skz_player_daily_game_allowed(p_game_slug text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(trim(p_game_slug), '') IN (
    'guess-song',
    'guess-member',
    'guess-lyric'
  );
$$;

-- Exchange bot-issued code for a player session (NOT admin).
CREATE OR REPLACE FUNCTION skz_player_exchange_discord_login(p_login_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row skz_player_discord_login_codes%ROWTYPE;
  v_token text;
  v_display text;
BEGIN
  SELECT * INTO v_row
  FROM skz_player_discord_login_codes
  WHERE login_code = upper(trim(p_login_code))
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid or expired login code' USING ERRCODE = '42501';
  END IF;

  UPDATE skz_player_discord_login_codes
  SET used_at = now()
  WHERE login_code = v_row.login_code;

  v_display := COALESCE(NULLIF(trim(v_row.global_name), ''), v_row.username);

  INSERT INTO skz_player_profiles (
    discord_user_id, username, global_name, avatar_hash, linked_at, updated_at
  ) VALUES (
    v_row.discord_user_id,
    v_row.username,
    v_row.global_name,
    v_row.avatar_hash,
    now(),
    now()
  )
  ON CONFLICT (discord_user_id) DO UPDATE SET
    username = EXCLUDED.username,
    global_name = EXCLUDED.global_name,
    avatar_hash = EXCLUDED.avatar_hash,
    updated_at = now();

  v_token := 'p_' || md5(
    random()::text || clock_timestamp()::text || v_row.discord_user_id || v_row.login_code || 'player'
  ) || md5(
    random()::text || clock_timestamp()::text || 'skz_player_session'
  );

  INSERT INTO skz_player_web_sessions (
    session_token, discord_user_id, username, global_name, avatar_hash, expires_at
  ) VALUES (
    v_token,
    v_row.discord_user_id,
    v_row.username,
    v_row.global_name,
    v_row.avatar_hash,
    now() + interval '30 days'
  );

  RETURN jsonb_build_object(
    'session_token', v_token,
    'discord_user_id', v_row.discord_user_id,
    'discord_username', v_display,
    'username', v_row.username,
    'global_name', v_row.global_name,
    'avatar_hash', v_row.avatar_hash,
    'expires_at', (now() + interval '30 days')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_player_exchange_discord_login(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_player_validate_session(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row skz_player_web_sessions%ROWTYPE;
  v_display text;
BEGIN
  IF p_session_token IS NULL OR trim(p_session_token) = '' THEN
    RETURN NULL;
  END IF;

  IF left(trim(p_session_token), 2) <> 'p_' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_row
  FROM skz_player_web_sessions
  WHERE session_token = trim(p_session_token)
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_display := COALESCE(NULLIF(trim(v_row.global_name), ''), v_row.username);

  RETURN jsonb_build_object(
    'session_token', v_row.session_token,
    'discord_user_id', v_row.discord_user_id,
    'discord_username', v_display,
    'username', v_row.username,
    'global_name', v_row.global_name,
    'avatar_hash', v_row.avatar_hash,
    'expires_at', v_row.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_player_validate_session(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_player_revoke_session(p_session_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE skz_player_web_sessions
  SET revoked_at = now()
  WHERE session_token = trim(p_session_token)
    AND revoked_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION skz_player_revoke_session(text) TO anon, authenticated;

-- Record points: 1 point per correct guess on a daily puzzle (typically 1 on win).
CREATE OR REPLACE FUNCTION skz_player_record_daily_points(
  p_session_token text,
  p_game_slug text,
  p_puzzle_date text,
  p_correct_guesses int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session skz_player_web_sessions%ROWTYPE;
  v_date date;
  v_correct int;
  v_points int;
  v_existing int;
BEGIN
  SELECT * INTO v_session
  FROM skz_player_web_sessions
  WHERE session_token = trim(p_session_token)
    AND revoked_at IS NULL
    AND expires_at > now()
    AND left(session_token, 2) = 'p_'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;

  IF NOT skz_player_daily_game_allowed(p_game_slug) THEN
    RAISE EXCEPTION 'game does not support player leaderboard points' USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_date := NULLIF(trim(p_puzzle_date), '')::date;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'invalid puzzle date' USING ERRCODE = '22023';
  END;

  IF v_date IS NULL THEN
    RAISE EXCEPTION 'invalid puzzle date' USING ERRCODE = '22023';
  END IF;

  v_correct := GREATEST(0, COALESCE(p_correct_guesses, 0));
  v_points := v_correct;

  IF v_points <= 0 THEN
    RETURN jsonb_build_object(
      'added_points', 0,
      'total_points', COALESCE((
        SELECT SUM(points)::int FROM skz_player_daily_points WHERE discord_user_id = v_session.discord_user_id
      ), 0)
    );
  END IF;

  SELECT points INTO v_existing
  FROM skz_player_daily_points
  WHERE discord_user_id = v_session.discord_user_id
    AND game_slug = trim(p_game_slug)
    AND puzzle_date = v_date
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'added_points', 0,
      'already_recorded', true,
      'total_points', COALESCE((
        SELECT SUM(points)::int FROM skz_player_daily_points WHERE discord_user_id = v_session.discord_user_id
      ), 0)
    );
  END IF;

  INSERT INTO skz_player_daily_points (
    discord_user_id, game_slug, puzzle_date, points, correct_guesses
  ) VALUES (
    v_session.discord_user_id, trim(p_game_slug), v_date, v_points, v_correct
  );

  UPDATE skz_player_profiles
  SET username = v_session.username,
      global_name = v_session.global_name,
      avatar_hash = v_session.avatar_hash,
      updated_at = now()
  WHERE discord_user_id = v_session.discord_user_id;

  RETURN jsonb_build_object(
    'added_points', v_points,
    'total_points', COALESCE((
      SELECT SUM(points)::int FROM skz_player_daily_points WHERE discord_user_id = v_session.discord_user_id
    ), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_player_record_daily_points(text, text, text, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_get_global_player_leaderboard(
  p_days int DEFAULT NULL,
  p_limit int DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_since date;
BEGIN
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 25), 100));

  IF p_days IS NOT NULL AND p_days > 0 THEN
    v_since := (current_date - (LEAST(p_days, 365) - 1));
  END IF;

  RETURN jsonb_build_object(
    'days', p_days,
    'entries', COALESCE((
      SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.rank)
      FROM (
        SELECT
          row_number() OVER (ORDER BY s.total_points DESC, s.last_scored_at ASC)::int AS rank,
          s.discord_user_id,
          COALESCE(NULLIF(trim(p.global_name), ''), p.username, 'Player') AS display_name,
          p.username,
          p.avatar_hash,
          s.total_points,
          s.daily_wins
        FROM (
          SELECT
            dp.discord_user_id,
            SUM(dp.points)::int AS total_points,
            COUNT(*)::int AS daily_wins,
            MAX(dp.created_at) AS last_scored_at
          FROM skz_player_daily_points dp
          JOIN skz_player_profiles pr ON pr.discord_user_id = dp.discord_user_id
          WHERE pr.show_on_board
            AND (v_since IS NULL OR dp.puzzle_date >= v_since)
          GROUP BY dp.discord_user_id
          HAVING SUM(dp.points) > 0
        ) s
        JOIN skz_player_profiles p ON p.discord_user_id = s.discord_user_id
        ORDER BY s.total_points DESC, s.last_scored_at ASC
        LIMIT v_limit
      ) r
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_get_global_player_leaderboard(int, int) TO anon, authenticated;

-- Player session summary (rank + points) for signed-in user
CREATE OR REPLACE FUNCTION skz_player_get_my_stats(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session jsonb;
  v_user_id text;
  v_total int;
  v_rank int;
BEGIN
  v_session := skz_player_validate_session(p_session_token);
  IF v_session IS NULL THEN
    RETURN NULL;
  END IF;

  v_user_id := v_session->>'discord_user_id';

  SELECT COALESCE(SUM(points), 0)::int INTO v_total
  FROM skz_player_daily_points
  WHERE discord_user_id = v_user_id;

  SELECT COUNT(*)::int + 1 INTO v_rank
  FROM (
    SELECT discord_user_id, SUM(points) AS pts
    FROM skz_player_daily_points
    GROUP BY discord_user_id
    HAVING SUM(points) > v_total
  ) higher;

  IF v_total = 0 THEN
    v_rank := NULL;
  END IF;

  RETURN v_session || jsonb_build_object(
    'total_points', v_total,
    'global_rank', v_rank
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_player_get_my_stats(text) TO anon, authenticated;
