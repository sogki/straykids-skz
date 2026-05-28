-- Moderation logging: Discord events → DB + log channels; admin panel viewer via web session.

-- ── Settings ──
INSERT INTO skz_bot_settings (key, description) VALUES
  ('mod_log_enabled',              'Enable moderation logging (join + messages)'),
  ('mod_log_join_channel_id',      'Discord channel for member join / account info logs'),
  ('mod_log_message_channel_id', 'Discord channel for message edit / delete logs'),
  ('mod_log_member_join',          'Log when a member joins the server'),
  ('mod_log_message_edits',        'Log message edits'),
  ('mod_log_message_deletes',      'Log single message deletes'),
  ('mod_log_message_bulk_deletes', 'Log bulk message deletes')
ON CONFLICT (key) DO NOTHING;

UPDATE skz_bot_settings SET value = 'false' WHERE key = 'mod_log_enabled' AND value = '';
UPDATE skz_bot_settings SET value = 'true'  WHERE key IN (
  'mod_log_member_join',
  'mod_log_message_edits',
  'mod_log_message_deletes',
  'mod_log_message_bulk_deletes'
) AND value = '';

-- ── Persisted events (admin panel viewer) ──
CREATE TABLE IF NOT EXISTS skz_bot_mod_log_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id        text NOT NULL,
  event_type      text NOT NULL CHECK (event_type IN (
    'member_join',
    'member_info',
    'message_delete',
    'message_edit',
    'message_bulk_delete'
  )),
  channel_id      text,
  actor_user_id   text,
  target_user_id  text,
  message_id      text,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skz_bot_mod_log_events_guild_created_idx
  ON skz_bot_mod_log_events (guild_id, created_at DESC);

CREATE INDEX IF NOT EXISTS skz_bot_mod_log_events_type_idx
  ON skz_bot_mod_log_events (event_type, created_at DESC);

ALTER TABLE skz_bot_mod_log_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY skz_bot_mod_log_events_service_all ON skz_bot_mod_log_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── Feature toggles: mod_logs_config (full admin), mod_logs_view (moderators) ──
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
      '{"credentials":true,"server":true,"panels":true,"qotd":true,"session_logs":true,"role_permissions":true,"mod_logs_config":true,"mod_logs_view":true}'::jsonb
    WHEN p_permission_level = 'moderator' THEN
      '{"credentials":false,"server":false,"panels":true,"qotd":true,"session_logs":false,"role_permissions":false,"mod_logs_config":false,"mod_logs_view":false}'::jsonb
    ELSE
      '{"credentials":false,"server":false,"panels":false,"qotd":false,"session_logs":false,"role_permissions":false,"mod_logs_config":false,"mod_logs_view":false}'::jsonb
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
      'mod_logs_config','mod_logs_view'
    )
    AND lower(e.value) IN ('true','false');

  RETURN v_defaults || v_overrides;
END;
$$;

-- Session helper: can this web session view mod logs in the admin panel?
CREATE OR REPLACE FUNCTION skz_admin_bot_session_can_view_mod_logs(p_session_token text)
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
  RETURN COALESCE((v_features->>'mod_logs_view')::boolean, false);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_session_can_view_mod_logs(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_bot_list_mod_logs(
  p_session_token text,
  p_limit int DEFAULT 100,
  p_event_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id text;
  v_limit int;
BEGIN
  IF NOT skz_admin_bot_session_can_view_mod_logs(p_session_token) THEN
    RAISE EXCEPTION 'insufficient permission' USING ERRCODE = '42501';
  END IF;

  SELECT value INTO v_guild_id FROM skz_bot_settings WHERE key = 'guild_id' LIMIT 1;
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(e)::jsonb ORDER BY e.created_at DESC)
    FROM (
      SELECT
        id,
        guild_id,
        event_type,
        channel_id,
        actor_user_id,
        target_user_id,
        message_id,
        payload,
        created_at
      FROM skz_bot_mod_log_events
      WHERE guild_id = COALESCE(NULLIF(trim(v_guild_id), ''), guild_id)
        AND (
          p_event_type IS NULL
          OR NULLIF(trim(p_event_type), '') IS NULL
          OR event_type = trim(p_event_type)
        )
      ORDER BY created_at DESC
      LIMIT v_limit
    ) e
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_list_mod_logs(text, int, text) TO anon, authenticated;
