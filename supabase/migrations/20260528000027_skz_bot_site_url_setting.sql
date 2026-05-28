-- Public site origin for player OAuth redirects (and public config merge).

INSERT INTO skz_bot_settings (key, description, value) VALUES
  (
    'site_url',
    'Public SKZ Arcade origin (no trailing slash) — OAuth redirect base; set Discord redirect to {site_url}/api/player/auth/discord/callback',
    'https://skzarcade.com'
  )
ON CONFLICT (key) DO NOTHING;

UPDATE skz_bot_settings
SET value = 'https://skzarcade.com'
WHERE key = 'site_url' AND (value IS NULL OR trim(value) = '');

-- Include site_url in anon-safe public config (read from bot settings, not duplicated in skz_settings).
CREATE OR REPLACE FUNCTION skz_get_public_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(
      (SELECT jsonb_object_agg(key, value) FROM skz_settings WHERE is_public = true),
      '{}'::jsonb
    )
    || COALESCE(
      (
        SELECT jsonb_build_object('site_url', trim(value))
        FROM skz_bot_settings
        WHERE key = 'site_url'
          AND NULLIF(trim(value), '') IS NOT NULL
        LIMIT 1
      ),
      '{}'::jsonb
    );
$$;
