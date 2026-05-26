-- Admin action: reset leaderboard data by deleting tracked game events.
-- Optional game filter lets staff clear one game or all games.

CREATE OR REPLACE FUNCTION skz_admin_reset_leaderboard(
  p_code text,
  p_game_slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game text;
  v_deleted int;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  v_game := NULLIF(trim(p_game_slug), '');

  IF v_game IS NULL THEN
    DELETE FROM skz_analytics_events
    WHERE event_type IN ('game_start', 'game_complete');
  ELSE
    DELETE FROM skz_analytics_events
    WHERE event_type IN ('game_start', 'game_complete')
      AND game_slug = v_game;
  END IF;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted', v_deleted,
    'scope', COALESCE(v_game, 'all_games')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_reset_leaderboard(text, text) TO anon, authenticated;
