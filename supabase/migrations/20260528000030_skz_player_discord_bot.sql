-- Discord bot: player profile lookup + optional game filter on leaderboard

CREATE OR REPLACE FUNCTION skz_player_touch_discord_profile(
  p_discord_user_id text,
  p_username text,
  p_global_name text DEFAULT NULL,
  p_avatar_hash text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_discord_user_id IS NULL OR trim(p_discord_user_id) = '' THEN
    RETURN;
  END IF;

  INSERT INTO skz_player_profiles (
    discord_user_id,
    username,
    global_name,
    avatar_hash
  )
  VALUES (
    trim(p_discord_user_id),
    COALESCE(NULLIF(trim(p_username), ''), 'player'),
    NULLIF(trim(p_global_name), ''),
    NULLIF(trim(p_avatar_hash), '')
  )
  ON CONFLICT (discord_user_id) DO UPDATE SET
    username = EXCLUDED.username,
    global_name = COALESCE(EXCLUDED.global_name, skz_player_profiles.global_name),
    avatar_hash = COALESCE(EXCLUDED.avatar_hash, skz_player_profiles.avatar_hash),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION skz_player_touch_discord_profile(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION skz_player_touch_discord_profile(text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION skz_player_get_discord_profile(
  p_discord_user_id text,
  p_viewer_discord_user_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile skz_player_profiles%ROWTYPE;
  v_total int;
  v_rank int;
  v_wins int;
  v_history jsonb;
  v_by_game jsonb;
  v_display text;
  v_can_view boolean;
BEGIN
  IF p_discord_user_id IS NULL OR trim(p_discord_user_id) = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_profile
  FROM skz_player_profiles
  WHERE discord_user_id = trim(p_discord_user_id);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_display := COALESCE(NULLIF(trim(v_profile.global_name), ''), v_profile.username, 'Player');
  v_can_view := v_profile.show_on_board
    OR p_viewer_discord_user_id IS NOT NULL
      AND trim(p_viewer_discord_user_id) = trim(p_discord_user_id);

  IF NOT v_can_view THEN
    RETURN jsonb_build_object(
      'hidden', true,
      'discord_user_id', v_profile.discord_user_id,
      'display_name', v_display,
      'username', v_profile.username,
      'avatar_hash', v_profile.avatar_hash
    );
  END IF;

  SELECT COALESCE(SUM(points), 0)::int, COUNT(*)::int
  INTO v_total, v_wins
  FROM skz_player_daily_points
  WHERE discord_user_id = v_profile.discord_user_id;

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

  SELECT COALESCE(jsonb_agg(row_to_json(h)::jsonb ORDER BY h.puzzle_date DESC, h.game_slug), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT game_slug, puzzle_date, points, correct_guesses
    FROM skz_player_daily_points
    WHERE discord_user_id = v_profile.discord_user_id
    ORDER BY puzzle_date DESC, game_slug
    LIMIT 8
  ) h;

  SELECT COALESCE(jsonb_agg(row_to_json(g)::jsonb ORDER BY g.total_points DESC), '[]'::jsonb)
  INTO v_by_game
  FROM (
    SELECT
      game_slug,
      COUNT(*)::int AS days_played,
      COALESCE(SUM(points), 0)::int AS total_points
    FROM skz_player_daily_points
    WHERE discord_user_id = v_profile.discord_user_id
    GROUP BY game_slug
  ) g;

  RETURN jsonb_build_object(
    'hidden', false,
    'discord_user_id', v_profile.discord_user_id,
    'display_name', v_display,
    'username', v_profile.username,
    'global_name', v_profile.global_name,
    'avatar_hash', v_profile.avatar_hash,
    'linked_at', v_profile.linked_at,
    'show_on_board', v_profile.show_on_board,
    'total_points', v_total,
    'global_rank', v_rank,
    'daily_wins', v_wins,
    'points_by_game', v_by_game,
    'recent_scores', v_history
  );
END;
$$;

REVOKE ALL ON FUNCTION skz_player_get_discord_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION skz_player_get_discord_profile(text, text) TO service_role;

DROP FUNCTION IF EXISTS skz_get_global_player_leaderboard(integer, integer);

CREATE OR REPLACE FUNCTION skz_get_global_player_leaderboard(
  p_days int DEFAULT NULL,
  p_limit int DEFAULT 25,
  p_game_slug text DEFAULT NULL
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
  v_game text;
BEGIN
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 25), 100));

  IF p_days IS NOT NULL AND p_days > 0 THEN
    v_since := (current_date - (LEAST(p_days, 365) - 1));
  END IF;

  v_game := NULLIF(trim(p_game_slug), '');
  IF v_game IS NOT NULL AND NOT skz_player_daily_game_allowed(v_game) THEN
    v_game := NULL;
  END IF;

  RETURN jsonb_build_object(
    'days', p_days,
    'game_slug', v_game,
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
        LIMIT v_limit
      ) r
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_get_global_player_leaderboard(int, int, text) TO anon, authenticated;
