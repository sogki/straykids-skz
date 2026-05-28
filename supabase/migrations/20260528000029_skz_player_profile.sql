-- Profile page: session stats + daily point history for signed-in players

CREATE OR REPLACE FUNCTION skz_player_get_my_profile(p_session_token text)
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
  v_linked_at timestamptz;
  v_history jsonb;
  v_by_game jsonb;
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

  SELECT linked_at INTO v_linked_at
  FROM skz_player_profiles
  WHERE discord_user_id = v_user_id;

  SELECT COALESCE(jsonb_agg(row_to_json(h)::jsonb ORDER BY h.puzzle_date DESC, h.game_slug), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT game_slug, puzzle_date, points, correct_guesses, created_at
    FROM skz_player_daily_points
    WHERE discord_user_id = v_user_id
    ORDER BY puzzle_date DESC, game_slug
    LIMIT 60
  ) h;

  SELECT COALESCE(jsonb_agg(row_to_json(g)::jsonb ORDER BY g.total_points DESC), '[]'::jsonb)
  INTO v_by_game
  FROM (
    SELECT
      game_slug,
      COUNT(*)::int AS days_played,
      COALESCE(SUM(points), 0)::int AS total_points
    FROM skz_player_daily_points
    WHERE discord_user_id = v_user_id
    GROUP BY game_slug
  ) g;

  RETURN v_session || jsonb_build_object(
    'total_points', v_total,
    'global_rank', v_rank,
    'linked_at', v_linked_at,
    'daily_history', v_history,
    'points_by_game', v_by_game
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_player_get_my_profile(text) TO anon, authenticated;
