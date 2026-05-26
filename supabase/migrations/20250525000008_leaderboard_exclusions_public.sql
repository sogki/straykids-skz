-- Allow public leaderboard to read exclusion list (client-side filter fallback)
-- and lightweight RPC for excluded country codes.

DROP POLICY IF EXISTS skz_excluded_countries_public_read ON skz_analytics_excluded_countries;

CREATE POLICY skz_excluded_countries_public_read ON skz_analytics_excluded_countries
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION skz_get_leaderboard_excluded_countries()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(country_code ORDER BY country_code),
    '[]'::jsonb
  )
  FROM skz_analytics_excluded_countries;
$$;

GRANT EXECUTE ON FUNCTION skz_get_leaderboard_excluded_countries() TO anon, authenticated;
