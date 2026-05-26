-- New arcade games, leaderboard per game, admin exclusions + purge

-- ── Games registry (new dailies) ──
INSERT INTO skz_games (slug, title, description, emoji, path, color, tag, sort_order, is_active) VALUES
  ('guess-member', 'Daily Member Guess', 'Emoji clues. Name the member in 5 tries.', '🐺', '/guess-member', '#f472b6', 'Daily', 2, true),
  ('guess-lyric', 'Daily Lyric Guess', 'Fill the blank in an SKZ lyric. New line daily.', '📝', '/guess-lyric', '#38bdf8', 'Daily', 3, true),
  ('fan-profile', 'Fan Profile Maker', 'Design your STAY profile card.', '✨', '/fan-profile', '#ef4444', 'Creative', 4, true),
  ('bias-quiz', 'Bias Quiz', 'Which member matches your vibe?', '🎯', '/bias-quiz', '#c0c0c0', 'Quiz', 5, true)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  emoji = EXCLUDED.emoji,
  path = EXCLUDED.path,
  color = EXCLUDED.color,
  tag = EXCLUDED.tag,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

UPDATE skz_games SET sort_order = 1 WHERE slug = 'guess-song';

-- ── Countries excluded from leaderboard + filtered admin totals ──
CREATE TABLE IF NOT EXISTS skz_analytics_excluded_countries (
  country_code char(2) PRIMARY KEY,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skz_excluded_country_format CHECK (country_code ~ '^[A-Z]{2}$')
);

ALTER TABLE skz_analytics_excluded_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY skz_excluded_countries_service_all ON skz_analytics_excluded_countries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Helper: daily wins vs general completes ──
CREATE OR REPLACE FUNCTION skz_leaderboard_counts_as_win(p_game_slug text, p_metadata jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_game_slug IN ('guess-song', 'guess-member', 'guess-lyric')
      THEN COALESCE(p_metadata->>'status', '') = 'won'
    ELSE true
  END;
$$;

-- ── Public leaderboard (per game) ──
DROP FUNCTION IF EXISTS skz_get_public_leaderboard(int);

CREATE OR REPLACE FUNCTION skz_get_public_leaderboard(
  p_days int DEFAULT 30,
  p_game_slug text DEFAULT 'guess-song'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days int;
  v_since timestamptz;
  v_game text;
BEGIN
  v_days := GREATEST(1, LEAST(COALESCE(p_days, 30), 90));
  v_since := now() - (v_days || ' days')::interval;
  v_game := NULLIF(trim(p_game_slug), '');
  IF v_game IS NULL THEN
    v_game := 'guess-song';
  END IF;

  RETURN jsonb_build_object(
    'days', v_days,
    'game_slug', v_game,
    'entries', COALESCE((
      SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.rank)
      FROM (
        SELECT
          row_number() OVER (
            ORDER BY w.correct_wins DESC, ret.retention_pct DESC NULLS LAST
          )::int AS rank,
          w.country_code,
          w.correct_wins,
          COALESCE(ret.retention_pct, 0)::numeric(5,1) AS retention_pct,
          COALESCE(ret.game_starts, 0)::int AS game_starts
        FROM (
          SELECT
            country_code,
            COUNT(*)::int AS correct_wins
          FROM skz_analytics_events e
          WHERE e.created_at >= v_since
            AND e.country_code IS NOT NULL
            AND e.country_code <> 'XX'
            AND e.event_type = 'game_complete'
            AND e.game_slug = v_game
            AND skz_leaderboard_counts_as_win(v_game, e.metadata)
            AND NOT EXISTS (
              SELECT 1 FROM skz_analytics_excluded_countries x
              WHERE x.country_code = e.country_code
            )
          GROUP BY country_code
        ) w
        LEFT JOIN (
          SELECT
            country_code,
            COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'game_start')::int AS game_starts,
            CASE
              WHEN COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'game_start') > 0
              THEN round(
                100.0 * COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'game_complete')
                / COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'game_start'),
                1
              )
              ELSE 0
            END AS retention_pct
          FROM skz_analytics_events e
          WHERE e.created_at >= v_since
            AND e.country_code IS NOT NULL
            AND e.country_code <> 'XX'
            AND e.game_slug = v_game
            AND NOT EXISTS (
              SELECT 1 FROM skz_analytics_excluded_countries x
              WHERE x.country_code = e.country_code
            )
          GROUP BY country_code
        ) ret ON ret.country_code = w.country_code
        WHERE w.correct_wins > 0
        ORDER BY w.correct_wins DESC, ret.retention_pct DESC NULLS LAST
        LIMIT 10
      ) r
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_get_public_leaderboard(int, text) TO anon, authenticated;

-- ── Admin: list / add / remove exclusions ──
CREATE OR REPLACE FUNCTION skz_admin_list_excluded_countries(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.country_code)
    FROM (
      SELECT country_code, reason, created_at
      FROM skz_analytics_excluded_countries
    ) r
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_list_excluded_countries(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_set_country_excluded(
  p_code text,
  p_country_code text,
  p_excluded boolean,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cc char(2);
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  v_cc := upper(left(trim(p_country_code), 2));
  IF v_cc !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid country code';
  END IF;

  IF COALESCE(p_excluded, true) THEN
    INSERT INTO skz_analytics_excluded_countries (country_code, reason)
    VALUES (v_cc, NULLIF(trim(p_reason), ''))
    ON CONFLICT (country_code) DO UPDATE SET
      reason = COALESCE(EXCLUDED.reason, skz_analytics_excluded_countries.reason);
  ELSE
    DELETE FROM skz_analytics_excluded_countries WHERE country_code = v_cc;
  END IF;

  RETURN skz_admin_list_excluded_countries(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_set_country_excluded(text, text, boolean, text) TO anon, authenticated;

-- ── Admin: delete all analytics for a country (e.g. test traffic) ──
CREATE OR REPLACE FUNCTION skz_admin_purge_country_analytics(
  p_code text,
  p_country_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cc char(2);
  v_deleted int;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  v_cc := upper(left(trim(p_country_code), 2));
  IF v_cc !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid country code';
  END IF;

  DELETE FROM skz_analytics_events WHERE country_code = v_cc;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object('country_code', v_cc, 'deleted', v_deleted);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_purge_country_analytics(text, text) TO anon, authenticated;

-- ── Admin analytics: respect exclusions in totals ──
CREATE OR REPLACE FUNCTION skz_admin_get_analytics(
  p_code text,
  p_days int DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days int;
  v_since timestamptz;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  v_days := GREATEST(1, LEAST(COALESCE(p_days, 7), 90));
  v_since := now() - (v_days || ' days')::interval;

  RETURN jsonb_build_object(
    'days', v_days,
    'since', v_since,
    'excluded_countries', COALESCE((
      SELECT jsonb_agg(country_code ORDER BY country_code)
      FROM skz_analytics_excluded_countries
    ), '[]'::jsonb),
    'totals', (
      SELECT jsonb_build_object(
        'page_views', COUNT(*) FILTER (WHERE event_type = 'page_view'),
        'game_starts', COUNT(*) FILTER (WHERE event_type = 'game_start'),
        'game_completes', COUNT(*) FILTER (WHERE event_type = 'game_complete'),
        'all_events', COUNT(*)
      )
      FROM skz_analytics_events e
      WHERE e.created_at >= v_since
        AND (
          e.country_code IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM skz_analytics_excluded_countries x
            WHERE x.country_code = e.country_code
          )
        )
    ),
    'totals_raw', (
      SELECT jsonb_build_object(
        'page_views', COUNT(*) FILTER (WHERE event_type = 'page_view'),
        'game_starts', COUNT(*) FILTER (WHERE event_type = 'game_start'),
        'game_completes', COUNT(*) FILTER (WHERE event_type = 'game_complete'),
        'all_events', COUNT(*)
      )
      FROM skz_analytics_events
      WHERE created_at >= v_since
    ),
    'unique_sessions', (
      SELECT COUNT(DISTINCT session_id)
      FROM skz_analytics_events e
      WHERE e.created_at >= v_since
        AND (
          e.country_code IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM skz_analytics_excluded_countries x
            WHERE x.country_code = e.country_code
          )
        )
    ),
    'by_day', COALESCE((
      SELECT jsonb_agg(row_to_json(d)::jsonb ORDER BY d.day)
      FROM (
        SELECT
          to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
          COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
          COUNT(*) FILTER (WHERE event_type = 'game_start') AS game_starts,
          COUNT(DISTINCT session_id) AS sessions
        FROM skz_analytics_events e
        WHERE e.created_at >= v_since
          AND (
            e.country_code IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM skz_analytics_excluded_countries x
              WHERE x.country_code = e.country_code
            )
          )
        GROUP BY 1
      ) d
    ), '[]'::jsonb),
    'by_game', COALESCE((
      SELECT jsonb_agg(row_to_json(g)::jsonb ORDER BY g.starts DESC)
      FROM (
        SELECT
          game_slug,
          COUNT(*) FILTER (WHERE event_type = 'game_start') AS starts,
          COUNT(*) FILTER (WHERE event_type = 'game_complete') AS completes,
          COUNT(*) FILTER (
            WHERE event_type = 'game_complete'
              AND skz_leaderboard_counts_as_win(game_slug, metadata)
          ) AS wins
        FROM skz_analytics_events e
        WHERE e.created_at >= v_since
          AND game_slug IS NOT NULL
          AND (
            e.country_code IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM skz_analytics_excluded_countries x
              WHERE x.country_code = e.country_code
            )
          )
        GROUP BY game_slug
      ) g
    ), '[]'::jsonb),
    'by_country', COALESCE((
      SELECT jsonb_agg(row_to_json(c)::jsonb ORDER BY c.events DESC)
      FROM (
        SELECT
          country_code,
          COUNT(*)::int AS events,
          COUNT(*) FILTER (WHERE event_type = 'game_complete' AND metadata->>'status' = 'won')::int AS song_wins
        FROM skz_analytics_events
        WHERE created_at >= v_since
          AND country_code IS NOT NULL
        GROUP BY country_code
      ) c
    ), '[]'::jsonb),
    'recent', COALESCE((
      SELECT jsonb_agg(row_to_json(r)::jsonb)
      FROM (
        SELECT event_type, path, game_slug, session_id, country_code, metadata, created_at
        FROM skz_analytics_events
        WHERE created_at >= v_since
        ORDER BY created_at DESC
        LIMIT 40
      ) r
    ), '[]'::jsonb)
  );
END;
$$;
