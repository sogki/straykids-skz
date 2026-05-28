-- Leaderboard pagination: limit + offset + total_count

DROP FUNCTION IF EXISTS skz_get_global_player_leaderboard(integer, integer, text);

CREATE OR REPLACE FUNCTION skz_get_global_player_leaderboard(
  p_days int DEFAULT NULL,
  p_limit int DEFAULT 10,
  p_game_slug text DEFAULT NULL,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_offset int;
  v_since date;
  v_game text;
  v_total int;
BEGIN
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
  v_offset := GREATEST(0, COALESCE(p_offset, 0));

  IF p_days IS NOT NULL AND p_days > 0 THEN
    v_since := (current_date - (LEAST(p_days, 365) - 1));
  END IF;

  v_game := NULLIF(trim(p_game_slug), '');
  IF v_game IS NOT NULL AND NOT skz_player_daily_game_allowed(v_game) THEN
    v_game := NULL;
  END IF;

  SELECT COUNT(*)::int INTO v_total
  FROM (
    SELECT dp.discord_user_id
    FROM skz_player_daily_points dp
    JOIN skz_player_profiles pr ON pr.discord_user_id = dp.discord_user_id
    WHERE pr.show_on_board
      AND (v_since IS NULL OR dp.puzzle_date >= v_since)
      AND (v_game IS NULL OR dp.game_slug = v_game)
    GROUP BY dp.discord_user_id
    HAVING SUM(dp.points) > 0
  ) t;

  RETURN jsonb_build_object(
    'days', p_days,
    'game_slug', v_game,
    'limit', v_limit,
    'offset', v_offset,
    'total_count', v_total,
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
            AND (v_game IS NULL OR dp.game_slug = v_game)
          GROUP BY dp.discord_user_id
          HAVING SUM(dp.points) > 0
        ) s
        JOIN skz_player_profiles p ON p.discord_user_id = s.discord_user_id
        ORDER BY s.total_points DESC, s.last_scored_at ASC
        OFFSET v_offset
        LIMIT v_limit
      ) r
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_get_global_player_leaderboard(int, int, text, int) TO anon, authenticated;

DROP FUNCTION IF EXISTS skz_get_public_leaderboard(int, text);

CREATE OR REPLACE FUNCTION skz_get_public_leaderboard(
  p_days int DEFAULT 30,
  p_game_slug text DEFAULT 'guess-song',
  p_limit int DEFAULT 10,
  p_offset int DEFAULT 0
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
  v_limit int;
  v_offset int;
  v_total int;
BEGIN
  v_days := GREATEST(1, LEAST(COALESCE(p_days, 30), 90));
  v_since := now() - (v_days || ' days')::interval;
  v_game := NULLIF(trim(p_game_slug), '');
  IF v_game IS NULL THEN
    v_game := 'guess-song';
  END IF;
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
  v_offset := GREATEST(0, COALESCE(p_offset, 0));

  SELECT COUNT(*)::int INTO v_total
  FROM (
    SELECT country_code
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
    HAVING COUNT(*) > 0
  ) t;

  RETURN jsonb_build_object(
    'days', v_days,
    'game_slug', v_game,
    'limit', v_limit,
    'offset', v_offset,
    'total_count', v_total,
    'entries', COALESCE((
      SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.rank)
      FROM (
        SELECT
          ranked.rank,
          ranked.country_code,
          ranked.correct_wins,
          ranked.retention_pct,
          ranked.game_starts
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
        ) ranked
        ORDER BY ranked.rank
        OFFSET v_offset
        LIMIT v_limit
      ) r
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_get_public_leaderboard(int, text, int, int) TO anon, authenticated;
