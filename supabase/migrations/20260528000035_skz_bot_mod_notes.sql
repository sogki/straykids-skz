-- Staff moderation notes per Discord user (Discord /notes + admin panel).

CREATE TABLE IF NOT EXISTS skz_bot_mod_notes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id                text NOT NULL,
  target_discord_user_id  text NOT NULL,
  target_username         text NOT NULL DEFAULT '',
  target_display_name     text NOT NULL DEFAULT '',
  target_avatar_url       text NOT NULL DEFAULT '',
  author_discord_user_id  text NOT NULL,
  author_username         text NOT NULL DEFAULT '',
  body                    text NOT NULL CHECK (
    char_length(trim(body)) >= 1 AND char_length(body) <= 2000
  ),
  source                  text NOT NULL DEFAULT 'discord'
    CHECK (source IN ('discord', 'admin_panel')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz
);

CREATE INDEX IF NOT EXISTS skz_bot_mod_notes_target_active_idx
  ON skz_bot_mod_notes (guild_id, target_discord_user_id, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE skz_bot_mod_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY skz_bot_mod_notes_service_all ON skz_bot_mod_notes
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── Feature flag: mod_notes ──
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
      '{"credentials":true,"server":true,"panels":true,"qotd":true,"session_logs":true,"role_permissions":true,"mod_logs_config":true,"mod_logs_view":true,"welcome_goodbye":true,"mod_notes":true}'::jsonb
    WHEN p_permission_level = 'moderator' THEN
      '{"credentials":false,"server":false,"panels":true,"qotd":true,"session_logs":false,"role_permissions":false,"mod_logs_config":false,"mod_logs_view":false,"welcome_goodbye":false,"mod_notes":false}'::jsonb
    ELSE
      '{"credentials":false,"server":false,"panels":false,"qotd":false,"session_logs":false,"role_permissions":false,"mod_logs_config":false,"mod_logs_view":false,"welcome_goodbye":false,"mod_notes":false}'::jsonb
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
    AND e.key IN (
      'credentials','server','panels','qotd','session_logs','role_permissions',
      'mod_logs_config','mod_logs_view','welcome_goodbye','mod_notes'
    )
    AND lower(e.value) IN ('true','false');

  RETURN v_defaults || v_overrides;
END;
$$;

CREATE OR REPLACE FUNCTION skz_admin_bot_session_can_manage_mod_notes(p_session_token text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row skz_admin_web_sessions%ROWTYPE;
  v_features jsonb;
BEGIN
  SELECT * INTO v_row
  FROM skz_admin_web_sessions
  WHERE session_token = trim(p_session_token)
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_row.permission_level = 'full_admin' THEN
    RETURN true;
  END IF;

  v_features := skz_admin_bot_features_for_user(v_row.discord_user_id, v_row.permission_level);
  RETURN COALESCE((v_features->>'mod_notes')::boolean, false);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_session_can_manage_mod_notes(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_bot_list_mod_note_subjects(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id text;
BEGIN
  IF NOT skz_admin_bot_session_can_manage_mod_notes(p_session_token) THEN
    RAISE EXCEPTION 'insufficient permission' USING ERRCODE = '42501';
  END IF;

  SELECT value INTO v_guild_id FROM skz_bot_settings WHERE key = 'guild_id' LIMIT 1;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(s)::jsonb ORDER BY s.note_count DESC, s.target_display_name, s.target_username)
    FROM (
      SELECT DISTINCT ON (n.target_discord_user_id)
        n.target_discord_user_id,
        n.target_username,
        n.target_display_name,
        n.target_avatar_url,
        (
          SELECT count(*)::int
          FROM skz_bot_mod_notes c
          WHERE c.guild_id = n.guild_id
            AND c.target_discord_user_id = n.target_discord_user_id
            AND c.deleted_at IS NULL
        ) AS note_count
      FROM skz_bot_mod_notes n
      WHERE n.guild_id = COALESCE(NULLIF(trim(v_guild_id), ''), n.guild_id)
        AND n.deleted_at IS NULL
      ORDER BY n.target_discord_user_id, n.created_at DESC
    ) s
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_list_mod_note_subjects(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_bot_list_mod_notes(
  p_session_token text,
  p_target_discord_user_id text,
  p_page int DEFAULT 1,
  p_per_page int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id text;
  v_page int;
  v_per_page int;
  v_offset int;
  v_total int;
BEGIN
  IF NOT skz_admin_bot_session_can_manage_mod_notes(p_session_token) THEN
    RAISE EXCEPTION 'insufficient permission' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(trim(p_target_discord_user_id), '') IS NULL THEN
    RAISE EXCEPTION 'target_discord_user_id required';
  END IF;

  SELECT value INTO v_guild_id FROM skz_bot_settings WHERE key = 'guild_id' LIMIT 1;
  v_page := GREATEST(1, COALESCE(p_page, 1));
  v_per_page := GREATEST(1, LEAST(COALESCE(p_per_page, 10), 50));
  v_offset := (v_page - 1) * v_per_page;

  SELECT count(*)::int INTO v_total
  FROM skz_bot_mod_notes
  WHERE guild_id = COALESCE(NULLIF(trim(v_guild_id), ''), guild_id)
    AND target_discord_user_id = trim(p_target_discord_user_id)
    AND deleted_at IS NULL;

  RETURN jsonb_build_object(
    'notes', COALESCE((
      SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC)
      FROM (
        SELECT
          id,
          guild_id,
          target_discord_user_id,
          target_username,
          target_display_name,
          target_avatar_url,
          author_discord_user_id,
          author_username,
          body,
          source,
          created_at
        FROM skz_bot_mod_notes
        WHERE guild_id = COALESCE(NULLIF(trim(v_guild_id), ''), guild_id)
          AND target_discord_user_id = trim(p_target_discord_user_id)
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT v_per_page
        OFFSET v_offset
      ) r
    ), '[]'::jsonb),
    'page', v_page,
    'per_page', v_per_page,
    'total', v_total,
    'total_pages', GREATEST(1, CEIL(v_total::numeric / v_per_page::numeric)::int)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_list_mod_notes(text, text, int, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_bot_create_mod_note(
  p_session_token text,
  p_target_discord_user_id text,
  p_body text,
  p_target_username text DEFAULT '',
  p_target_display_name text DEFAULT '',
  p_target_avatar_url text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row skz_admin_web_sessions%ROWTYPE;
  v_guild_id text;
  v_note skz_bot_mod_notes%ROWTYPE;
BEGIN
  IF NOT skz_admin_bot_session_can_manage_mod_notes(p_session_token) THEN
    RAISE EXCEPTION 'insufficient permission' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(trim(p_target_discord_user_id), '') IS NULL THEN
    RAISE EXCEPTION 'target_discord_user_id required';
  END IF;

  IF NULLIF(trim(p_body), '') IS NULL OR char_length(trim(p_body)) > 2000 THEN
    RAISE EXCEPTION 'note body must be 1–2000 characters';
  END IF;

  SELECT * INTO v_row
  FROM skz_admin_web_sessions
  WHERE session_token = trim(p_session_token)
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  SELECT value INTO v_guild_id FROM skz_bot_settings WHERE key = 'guild_id' LIMIT 1;
  IF NULLIF(trim(v_guild_id), '') IS NULL THEN
    RAISE EXCEPTION 'guild_id is not configured in bot settings';
  END IF;

  INSERT INTO skz_bot_mod_notes (
    guild_id,
    target_discord_user_id,
    target_username,
    target_display_name,
    target_avatar_url,
    author_discord_user_id,
    author_username,
    body,
    source
  ) VALUES (
    trim(v_guild_id),
    trim(p_target_discord_user_id),
    COALESCE(NULLIF(trim(p_target_username), ''), trim(p_target_discord_user_id)),
    COALESCE(NULLIF(trim(p_target_display_name), ''), NULLIF(trim(p_target_username), ''), trim(p_target_discord_user_id)),
    COALESCE(trim(p_target_avatar_url), ''),
    v_row.discord_user_id,
    COALESCE(NULLIF(trim(v_row.display_name), ''), v_row.discord_user_id),
    trim(p_body),
    'admin_panel'
  )
  RETURNING * INTO v_note;

  RETURN row_to_json(v_note)::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_create_mod_note(text, text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_bot_delete_mod_note(
  p_session_token text,
  p_note_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id text;
BEGIN
  IF NOT skz_admin_bot_session_can_manage_mod_notes(p_session_token) THEN
    RAISE EXCEPTION 'insufficient permission' USING ERRCODE = '42501';
  END IF;

  SELECT value INTO v_guild_id FROM skz_bot_settings WHERE key = 'guild_id' LIMIT 1;

  UPDATE skz_bot_mod_notes
  SET deleted_at = now()
  WHERE id = p_note_id
    AND guild_id = COALESCE(NULLIF(trim(v_guild_id), ''), guild_id)
    AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_delete_mod_note(text, uuid) TO anon, authenticated;
