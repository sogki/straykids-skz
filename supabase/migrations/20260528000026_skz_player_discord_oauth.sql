-- Player Discord OAuth (API server uses service role — separate from admin auth).

INSERT INTO skz_bot_settings (key, description) VALUES
  ('discord_client_secret', 'Discord OAuth client secret — server-side only (player login API)')
ON CONFLICT (key) DO NOTHING;

-- Issue a player session from Discord OAuth user payload (service_role / API only).
CREATE OR REPLACE FUNCTION skz_player_create_session_from_discord(
  p_discord_user_id text,
  p_username text,
  p_global_name text DEFAULT NULL,
  p_avatar_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_display text;
BEGIN
  IF p_discord_user_id IS NULL OR trim(p_discord_user_id) = '' THEN
    RAISE EXCEPTION 'discord_user_id required' USING ERRCODE = '22023';
  END IF;

  v_display := COALESCE(NULLIF(trim(p_global_name), ''), NULLIF(trim(p_username), ''), 'Player');

  INSERT INTO skz_player_profiles (
    discord_user_id, username, global_name, avatar_hash, linked_at, updated_at
  ) VALUES (
    trim(p_discord_user_id),
    COALESCE(NULLIF(trim(p_username), ''), 'player'),
    NULLIF(trim(p_global_name), ''),
    NULLIF(trim(p_avatar_hash), ''),
    now(),
    now()
  )
  ON CONFLICT (discord_user_id) DO UPDATE SET
    username = EXCLUDED.username,
    global_name = EXCLUDED.global_name,
    avatar_hash = EXCLUDED.avatar_hash,
    updated_at = now();

  v_token := 'p_' || md5(
    random()::text || clock_timestamp()::text || p_discord_user_id || 'oauth'
  ) || md5(
    random()::text || clock_timestamp()::text || 'skz_player_oauth_session'
  );

  INSERT INTO skz_player_web_sessions (
    session_token, discord_user_id, username, global_name, avatar_hash, expires_at
  ) VALUES (
    v_token,
    trim(p_discord_user_id),
    COALESCE(NULLIF(trim(p_username), ''), 'player'),
    NULLIF(trim(p_global_name), ''),
    NULLIF(trim(p_avatar_hash), ''),
    now() + interval '30 days'
  );

  RETURN jsonb_build_object(
    'session_token', v_token,
    'discord_user_id', trim(p_discord_user_id),
    'discord_username', v_display,
    'username', COALESCE(NULLIF(trim(p_username), ''), 'player'),
    'global_name', NULLIF(trim(p_global_name), ''),
    'avatar_hash', NULLIF(trim(p_avatar_hash), ''),
    'expires_at', (now() + interval '30 days')
  );
END;
$$;

REVOKE ALL ON FUNCTION skz_player_create_session_from_discord(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION skz_player_create_session_from_discord(text, text, text, text) TO service_role;
