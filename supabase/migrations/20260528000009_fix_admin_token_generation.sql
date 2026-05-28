-- Fix token generation for environments without gen_random_bytes().
-- Replaces token creation in skz_admin_exchange_discord_login.

CREATE OR REPLACE FUNCTION skz_admin_exchange_discord_login(p_login_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row skz_admin_discord_login_codes%ROWTYPE;
  v_token text;
  v_sections jsonb;
BEGIN
  SELECT * INTO v_row
  FROM skz_admin_discord_login_codes
  WHERE login_code = trim(p_login_code)
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid or expired login code' USING ERRCODE = '42501';
  END IF;

  UPDATE skz_admin_discord_login_codes
  SET used_at = now()
  WHERE login_code = v_row.login_code;

  v_token := md5(
    random()::text || clock_timestamp()::text || v_row.discord_user_id || v_row.login_code
  ) || md5(
    random()::text || clock_timestamp()::text || v_row.guild_id || v_row.permission_level
  );

  v_sections := CASE
    WHEN v_row.permission_level = 'full_admin'
      THEN '["dashboard","banner","analytics","leaderboard","games","requests","bot"]'::jsonb
    WHEN v_row.permission_level = 'moderator'
      THEN '["bot"]'::jsonb
    ELSE '[]'::jsonb
  END;

  INSERT INTO skz_admin_web_sessions (
    session_token, discord_user_id, guild_id, display_name, permission_level, expires_at
  ) VALUES (
    v_token, v_row.discord_user_id, v_row.guild_id, v_row.display_name, v_row.permission_level, now() + interval '12 hours'
  );

  RETURN jsonb_build_object(
    'session_token', v_token,
    'discord_user_id', v_row.discord_user_id,
    'discord_display_name', v_row.display_name,
    'permission_level', v_row.permission_level,
    'allowed_sections', v_sections,
    'expires_at', (now() + interval '12 hours')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_exchange_discord_login(text) TO anon, authenticated;
