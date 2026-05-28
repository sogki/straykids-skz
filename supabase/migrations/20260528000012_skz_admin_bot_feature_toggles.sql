-- Per-role bot feature toggles + access payload enrichment.

ALTER TABLE skz_admin_discord_role_permissions
  ADD COLUMN IF NOT EXISTS bot_feature_access jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION skz_admin_bot_features_for_user(
  p_discord_user_id text,
  p_permission_level text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_ids text[];
  v_defaults jsonb;
  v_overrides jsonb := '{}'::jsonb;
BEGIN
  v_defaults := CASE
    WHEN p_permission_level = 'full_admin' THEN
      '{"credentials":true,"server":true,"panels":true,"qotd":true,"session_logs":true,"role_permissions":true}'::jsonb
    WHEN p_permission_level = 'moderator' THEN
      '{"credentials":false,"server":false,"panels":true,"qotd":true,"session_logs":false,"role_permissions":false}'::jsonb
    ELSE
      '{"credentials":false,"server":false,"panels":false,"qotd":false,"session_logs":false,"role_permissions":false}'::jsonb
  END;

  SELECT role_ids INTO v_role_ids
  FROM skz_admin_discord_member_roles_cache
  WHERE discord_user_id = p_discord_user_id
  LIMIT 1;

  IF v_role_ids IS NULL OR array_length(v_role_ids, 1) IS NULL THEN
    RETURN v_defaults;
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(e.key, to_jsonb((e.value)::boolean) ORDER BY rp.updated_at, rp.discord_role_id),
    '{}'::jsonb
  )
  INTO v_overrides
  FROM skz_admin_discord_role_permissions rp
  CROSS JOIN LATERAL jsonb_each_text(COALESCE(rp.bot_feature_access, '{}'::jsonb)) e
  WHERE rp.is_active
    AND rp.discord_role_id = ANY(v_role_ids)
    AND e.key IN ('credentials','server','panels','qotd','session_logs','role_permissions')
    AND lower(e.value) IN ('true','false');

  RETURN v_defaults || v_overrides;
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_features_for_user(text, text) TO anon, authenticated, service_role;

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
  v_features jsonb;
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

  v_features := skz_admin_bot_features_for_user(v_row.discord_user_id, v_row.permission_level);

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
    'allowed_bot_features', v_features,
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
  v_features jsonb;
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

  v_features := skz_admin_bot_features_for_user(v_row.discord_user_id, v_row.permission_level);

  RETURN jsonb_build_object(
    'session_token', v_row.session_token,
    'discord_user_id', v_row.discord_user_id,
    'discord_display_name', v_row.display_name,
    'permission_level', v_row.permission_level,
    'allowed_sections', v_sections,
    'allowed_bot_features', v_features,
    'expires_at', v_row.expires_at
  );
END;
$$;
GRANT EXECUTE ON FUNCTION skz_admin_validate_web_session(text) TO anon, authenticated;

-- Keep OAuth-style access function aligned if ever used.
CREATE OR REPLACE FUNCTION skz_admin_get_my_access()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_discord_user_id text;
  v_guild_id text;
  v_display_name text;
  v_role_ids text[];
  v_permission text := 'none';
  v_sections jsonb := '[]'::jsonb;
  v_features jsonb := '{"credentials":false,"server":false,"panels":false,"qotd":false,"session_logs":false,"role_permissions":false}'::jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'permission_level', 'none',
      'allowed_sections', '[]'::jsonb,
      'allowed_bot_features', v_features
    );
  END IF;

  v_discord_user_id := skz_admin_discord_user_id_for_auth_user(v_user_id);
  IF v_discord_user_id IS NULL OR v_discord_user_id = '' THEN
    RETURN jsonb_build_object(
      'authenticated', true,
      'permission_level', 'none',
      'allowed_sections', '[]'::jsonb,
      'allowed_bot_features', v_features
    );
  END IF;

  SELECT guild_id, display_name, role_ids
    INTO v_guild_id, v_display_name, v_role_ids
  FROM skz_admin_discord_member_roles_cache
  WHERE discord_user_id = v_discord_user_id;

  v_permission := skz_admin_permission_from_roles(v_role_ids);
  v_sections := CASE
    WHEN v_permission = 'full_admin'
      THEN '["dashboard","banner","analytics","leaderboard","games","requests","bot"]'::jsonb
    WHEN v_permission = 'moderator'
      THEN '["bot"]'::jsonb
    ELSE '[]'::jsonb
  END;
  v_features := skz_admin_bot_features_for_user(v_discord_user_id, v_permission);

  RETURN jsonb_build_object(
    'authenticated', true,
    'permission_level', v_permission,
    'allowed_sections', v_sections,
    'allowed_bot_features', v_features,
    'discord_user_id', v_discord_user_id,
    'discord_display_name', COALESCE(v_display_name, ''),
    'guild_id', COALESCE(v_guild_id, '')
  );
END;
$$;
GRANT EXECUTE ON FUNCTION skz_admin_get_my_access() TO authenticated;

-- Bot admin config now includes role permission rows.
CREATE OR REPLACE FUNCTION skz_admin_bot_get_config(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings jsonb;
  v_reaction_roles jsonb;
  v_messages jsonb;
  v_discord_cache jsonb;
  v_daily_questions jsonb;
  v_role_permissions jsonb;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_object_agg(key, skz_bot_mask_setting(key, value)), '{}'::jsonb)
  INTO v_settings
  FROM skz_bot_settings;

  SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.category, r.sort_order, r.label), '[]'::jsonb)
  INTO v_reaction_roles
  FROM (
    SELECT id, bot_message_id, channel_id, message_id, emoji, button_emoji, role_id, category, label,
           button_style, remove_on_unreact, sort_order, is_active, created_at, updated_at
    FROM skz_bot_reaction_roles
  ) r;

  SELECT COALESCE(jsonb_agg(row_to_json(m)::jsonb ORDER BY m.sort_order, m.label), '[]'::jsonb)
  INTO v_messages
  FROM (
    SELECT id, slug, label, kind, channel_id, discord_message_id, embed, interaction_mode, is_active, sort_order, created_at, updated_at
    FROM skz_bot_messages
  ) m;

  SELECT COALESCE(jsonb_agg(row_to_json(c)::jsonb ORDER BY c.entity_type, c.position, c.name), '[]'::jsonb)
  INTO v_discord_cache
  FROM (
    SELECT entity_type, entity_id, name, parent_id, channel_type, position, synced_at
    FROM skz_bot_discord_cache
    WHERE guild_id = COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'guild_id' LIMIT 1), '')
  ) c;

  SELECT COALESCE(jsonb_agg(row_to_json(q)::jsonb ORDER BY q.sort_order, q.created_at), '[]'::jsonb)
  INTO v_daily_questions
  FROM (
    SELECT id, prompt, is_active, sort_order, last_posted_at, post_count, created_at, updated_at
    FROM skz_bot_daily_questions
  ) q;

  SELECT COALESCE(jsonb_agg(row_to_json(p)::jsonb ORDER BY p.permission_level, p.label), '[]'::jsonb)
  INTO v_role_permissions
  FROM (
    SELECT discord_role_id, permission_level, label, is_active, bot_feature_access, created_at, updated_at
    FROM skz_admin_discord_role_permissions
  ) p;

  RETURN jsonb_build_object(
    'settings', v_settings,
    'reaction_roles', v_reaction_roles,
    'messages', v_messages,
    'discord_cache', v_discord_cache,
    'daily_questions', v_daily_questions,
    'role_permissions', v_role_permissions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_get_config(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_bot_upsert_role_permission(
  p_code text,
  p_discord_role_id text,
  p_permission_level text,
  p_label text DEFAULT '',
  p_is_active boolean DEFAULT true,
  p_bot_feature_access jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(trim(p_discord_role_id), '') IS NULL THEN
    RAISE EXCEPTION 'discord_role_id required';
  END IF;
  IF p_permission_level NOT IN ('full_admin', 'moderator', 'member') THEN
    RAISE EXCEPTION 'invalid permission_level';
  END IF;

  INSERT INTO skz_admin_discord_role_permissions (
    discord_role_id, permission_level, label, is_active, bot_feature_access
  ) VALUES (
    trim(p_discord_role_id),
    p_permission_level,
    COALESCE(NULLIF(trim(p_label), ''), trim(p_discord_role_id)),
    COALESCE(p_is_active, true),
    COALESCE(p_bot_feature_access, '{}'::jsonb)
  )
  ON CONFLICT (discord_role_id) DO UPDATE SET
    permission_level = EXCLUDED.permission_level,
    label = EXCLUDED.label,
    is_active = EXCLUDED.is_active,
    bot_feature_access = EXCLUDED.bot_feature_access,
    updated_at = now();

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_upsert_role_permission(text, text, text, text, boolean, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_bot_delete_role_permission(
  p_code text,
  p_discord_role_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;
  DELETE FROM skz_admin_discord_role_permissions
  WHERE discord_role_id = trim(p_discord_role_id);
  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_delete_role_permission(text, text) TO anon, authenticated;
