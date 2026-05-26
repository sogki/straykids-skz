-- Country-aware analytics + public leaderboard for arcade hub

ALTER TABLE skz_analytics_events
  ADD COLUMN IF NOT EXISTS country_code char(2);

CREATE INDEX IF NOT EXISTS skz_analytics_country_idx
  ON skz_analytics_events (country_code, created_at DESC)
  WHERE country_code IS NOT NULL;

-- Replace track_event to store ISO country code (from client locale / timezone)
DROP FUNCTION IF EXISTS skz_track_event(text, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION skz_track_event(
  p_event_type text,
  p_path text DEFAULT NULL,
  p_game_slug text DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_country_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session text;
  v_country char(2);
BEGIN
  IF p_event_type IS NULL OR length(trim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'event_type required';
  END IF;

  v_session := COALESCE(NULLIF(trim(p_session_id), ''), 'anonymous');

  v_country := NULL;
  IF p_country_code IS NOT NULL AND length(trim(p_country_code)) >= 2 THEN
    v_country := upper(left(trim(p_country_code), 2));
    IF v_country !~ '^[A-Z]{2}$' THEN
      v_country := NULL;
    END IF;
  END IF;

  INSERT INTO skz_analytics_events (
    event_type, path, game_slug, session_id, metadata, country_code
  )
  VALUES (
    lower(trim(p_event_type)),
    NULLIF(trim(p_path), ''),
    NULLIF(trim(p_game_slug), ''),
    v_session,
    COALESCE(p_metadata, '{}'::jsonb),
    v_country
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_track_event(text, text, text, text, jsonb, text) TO anon, authenticated;

-- Public leaderboard: correct daily song wins + session retention by country
CREATE OR REPLACE FUNCTION skz_get_public_leaderboard(p_days int DEFAULT 30)
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
  v_days := GREATEST(1, LEAST(COALESCE(p_days, 30), 90));
  v_since := now() - (v_days || ' days')::interval;

  RETURN jsonb_build_object(
    'days', v_days,
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
          FROM skz_analytics_events
          WHERE created_at >= v_since
            AND country_code IS NOT NULL
            AND country_code <> 'XX'
            AND event_type = 'game_complete'
            AND game_slug = 'guess-song'
            AND metadata->>'status' = 'won'
          GROUP BY country_code
        ) w
        LEFT JOIN (
          SELECT
            country_code,
            COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'game_start')::int AS game_starts,
            COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'game_complete')::int AS game_completes,
            CASE
              WHEN COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'game_start') > 0
              THEN round(
                100.0 * COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'game_complete')
                / COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'game_start'),
                1
              )
              ELSE 0
            END AS retention_pct
          FROM skz_analytics_events
          WHERE created_at >= v_since
            AND country_code IS NOT NULL
            AND country_code <> 'XX'
            AND game_slug IS NOT NULL
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

GRANT EXECUTE ON FUNCTION skz_get_public_leaderboard(int) TO anon, authenticated;
