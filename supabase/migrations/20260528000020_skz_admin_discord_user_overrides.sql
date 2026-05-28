-- Grant full_admin by Discord user ID (owner allowlist), independent of server roles.
-- Checked before role mappings; not manageable by moderators via the panel.

CREATE TABLE IF NOT EXISTS skz_admin_discord_user_permissions (
  discord_user_id text PRIMARY KEY,
  permission_level text NOT NULL DEFAULT 'full_admin'
    CHECK (permission_level = 'full_admin'),
  label text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS skz_admin_discord_user_permissions_updated_at
  ON skz_admin_discord_user_permissions;
CREATE TRIGGER skz_admin_discord_user_permissions_updated_at
  BEFORE UPDATE ON skz_admin_discord_user_permissions
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();

ALTER TABLE skz_admin_discord_user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skz_admin_discord_user_permissions_service ON skz_admin_discord_user_permissions;
CREATE POLICY skz_admin_discord_user_permissions_service ON skz_admin_discord_user_permissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Resolve permission: owner user ID wins, then Discord role mappings.
CREATE OR REPLACE FUNCTION skz_admin_permission_for_member(
  p_discord_user_id text,
  p_role_ids text[]
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NULLIF(trim(p_discord_user_id), '') IS NOT NULL AND EXISTS (
    SELECT 1
    FROM skz_admin_discord_user_permissions up
    WHERE up.is_active
      AND up.discord_user_id = trim(p_discord_user_id)
      AND up.permission_level = 'full_admin'
  ) THEN
    RETURN 'full_admin';
  END IF;

  RETURN skz_admin_permission_from_roles(p_role_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_permission_for_member(text, text[]) TO anon, authenticated, service_role;

-- Re-check permission on every session validation (roles can change; owner row can be revoked).
CREATE OR REPLACE FUNCTION skz_admin_validate_web_session(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row skz_admin_web_sessions%ROWTYPE;
  v_role_ids text[];
  v_permission text;
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

  SELECT role_ids INTO v_role_ids
  FROM skz_admin_discord_member_roles_cache
  WHERE discord_user_id = v_row.discord_user_id;

  v_permission := skz_admin_permission_for_member(v_row.discord_user_id, COALESCE(v_role_ids, '{}'::text[]));

  IF v_permission NOT IN ('full_admin', 'moderator', 'member') THEN
    RETURN NULL;
  END IF;

  IF v_permission IS DISTINCT FROM v_row.permission_level THEN
    UPDATE skz_admin_web_sessions
    SET permission_level = v_permission
    WHERE session_token = v_row.session_token;
    v_row.permission_level := v_permission;
  END IF;

  v_sections := CASE
    WHEN v_permission = 'full_admin'
      THEN '["dashboard","banner","analytics","leaderboard","games","requests","bot"]'::jsonb
    WHEN v_permission = 'moderator'
      THEN '["bot"]'::jsonb
    ELSE '[]'::jsonb
  END;

  v_features := skz_admin_bot_features_for_user(v_row.discord_user_id, v_permission);

  RETURN jsonb_build_object(
    'session_token', v_row.session_token,
    'discord_user_id', v_row.discord_user_id,
    'discord_display_name', v_row.display_name,
    'permission_level', v_permission,
    'allowed_sections', v_sections,
    'allowed_bot_features', v_features,
    'expires_at', v_row.expires_at
  );
END;
$$;

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

  v_permission := skz_admin_permission_for_member(v_discord_user_id, COALESCE(v_role_ids, '{}'::text[]));
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

-- Include owner rows in bot admin config (staff-code gated).
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
  v_user_permissions jsonb;
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
    SELECT id, prompt, question_type, is_active, sort_order, last_posted_at, post_count, created_at, updated_at
    FROM skz_bot_daily_questions
  ) q;

  SELECT COALESCE(jsonb_agg(row_to_json(p)::jsonb ORDER BY p.permission_level, p.label), '[]'::jsonb)
  INTO v_role_permissions
  FROM (
    SELECT discord_role_id, permission_level, label, is_active, bot_feature_access, created_at, updated_at
    FROM skz_admin_discord_role_permissions
  ) p;

  SELECT COALESCE(jsonb_agg(row_to_json(u)::jsonb ORDER BY u.label, u.discord_user_id), '[]'::jsonb)
  INTO v_user_permissions
  FROM (
    SELECT discord_user_id, permission_level, label, is_active, created_at, updated_at
    FROM skz_admin_discord_user_permissions
  ) u;

  RETURN jsonb_build_object(
    'settings', v_settings,
    'reaction_roles', v_reaction_roles,
    'messages', v_messages,
    'discord_cache', v_discord_cache,
    'daily_questions', v_daily_questions,
    'role_permissions', v_role_permissions,
    'user_permissions', v_user_permissions
  );
END;
$$;

CREATE OR REPLACE FUNCTION skz_admin_bot_upsert_user_permission(
  p_code text,
  p_discord_user_id text,
  p_label text DEFAULT ''
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
  IF NULLIF(trim(p_discord_user_id), '') IS NULL THEN
    RAISE EXCEPTION 'discord_user_id required';
  END IF;

  INSERT INTO skz_admin_discord_user_permissions (
    discord_user_id, permission_level, label, is_active
  ) VALUES (
    trim(p_discord_user_id),
    'full_admin',
    COALESCE(NULLIF(trim(p_label), ''), trim(p_discord_user_id)),
    true
  )
  ON CONFLICT (discord_user_id) DO UPDATE SET
    label = EXCLUDED.label,
    is_active = true,
    updated_at = now();

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_upsert_user_permission(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_bot_delete_user_permission(
  p_code text,
  p_discord_user_id text
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
  DELETE FROM skz_admin_discord_user_permissions
  WHERE discord_user_id = trim(p_discord_user_id);
  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_delete_user_permission(text, text) TO anon, authenticated;
