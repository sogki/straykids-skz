-- Bot-issued Discord login codes for admin panel (no Supabase OAuth provider required).

CREATE TABLE IF NOT EXISTS skz_admin_discord_login_codes (
  login_code text PRIMARY KEY,
  discord_user_id text NOT NULL,
  guild_id text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  permission_level text NOT NULL CHECK (permission_level IN ('full_admin', 'moderator')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skz_admin_discord_login_codes_user_idx
  ON skz_admin_discord_login_codes (discord_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS skz_admin_web_sessions (
  session_token text PRIMARY KEY,
  discord_user_id text NOT NULL,
  guild_id text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  permission_level text NOT NULL CHECK (permission_level IN ('full_admin', 'moderator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS skz_admin_web_sessions_user_idx
  ON skz_admin_web_sessions (discord_user_id, created_at DESC);

ALTER TABLE skz_admin_discord_login_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_admin_web_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skz_admin_discord_login_codes_service ON skz_admin_discord_login_codes;
CREATE POLICY skz_admin_discord_login_codes_service ON skz_admin_discord_login_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS skz_admin_web_sessions_service ON skz_admin_web_sessions;
CREATE POLICY skz_admin_web_sessions_service ON skz_admin_web_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION skz_admin_permission_from_roles(p_role_ids text[])
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM skz_admin_discord_role_permissions rp
    WHERE rp.is_active
      AND rp.permission_level = 'full_admin'
      AND rp.discord_role_id = ANY(COALESCE(p_role_ids, '{}'::text[]))
  ) THEN
    RETURN 'full_admin';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM skz_admin_discord_role_permissions rp
    WHERE rp.is_active
      AND rp.permission_level = 'moderator'
      AND rp.discord_role_id = ANY(COALESCE(p_role_ids, '{}'::text[]))
  ) THEN
    RETURN 'moderator';
  END IF;

  RETURN 'none';
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_permission_from_roles(text[]) TO anon, authenticated, service_role;

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

CREATE OR REPLACE FUNCTION skz_admin_validate_web_session(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row skz_admin_web_sessions%ROWTYPE;
  v_sections jsonb;
BEGIN
  SELECT * INTO v_row
  FROM skz_admin_web_sessions
  WHERE session_token = trim(p_session_token)
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_sections := CASE
    WHEN v_row.permission_level = 'full_admin'
      THEN '["dashboard","banner","analytics","leaderboard","games","requests","bot"]'::jsonb
    WHEN v_row.permission_level = 'moderator'
      THEN '["bot"]'::jsonb
    ELSE '[]'::jsonb
  END;

  RETURN jsonb_build_object(
    'session_token', v_row.session_token,
    'discord_user_id', v_row.discord_user_id,
    'discord_display_name', v_row.display_name,
    'permission_level', v_row.permission_level,
    'allowed_sections', v_sections,
    'expires_at', v_row.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_validate_web_session(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_revoke_web_session(p_session_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE skz_admin_web_sessions
  SET revoked_at = now()
  WHERE session_token = trim(p_session_token)
    AND revoked_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_revoke_web_session(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_get_staff_code_from_session(p_session_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row skz_admin_web_sessions%ROWTYPE;
  v_code text;
BEGIN
  SELECT * INTO v_row
  FROM skz_admin_web_sessions
  WHERE session_token = trim(p_session_token)
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND OR v_row.permission_level <> 'full_admin' THEN
    RAISE EXCEPTION 'insufficient permission' USING ERRCODE = '42501';
  END IF;

  SELECT staff_code INTO v_code FROM skz_admin_staff WHERE id = 1;
  RETURN trim(v_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_get_staff_code_from_session(text) TO anon, authenticated;
