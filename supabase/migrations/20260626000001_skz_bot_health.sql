-- Bot health heartbeat settings, RBAC feature flags, and admin health dashboard RPC.

INSERT INTO skz_bot_settings (key, value, description)
VALUES
  ('bot_started_at', '', 'ISO timestamp when the bot process last connected (synced)'),
  ('bot_heartbeat_at', '', 'ISO timestamp of the latest bot health heartbeat'),
  ('bot_ws_status', 'offline', 'Discord gateway status: ready | offline'),
  ('bot_outbox_last_run_at', '', 'ISO timestamp when the outbox worker last finished a batch'),
  ('bot_qotd_last_check_at', '', 'ISO timestamp when the QOTD scheduler last evaluated'),
  ('bot_cache_synced_at', '', 'ISO timestamp when Discord cache was last synced')
ON CONFLICT (key) DO NOTHING;

-- ── Feature flags: bot health + sub-sections ──
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
  v_valid_keys text[] := ARRAY[
    'credentials','server','panels','qotd','session_logs','role_permissions',
    'mod_logs_config','mod_logs_view','welcome_goodbye','mod_notes',
    'bot_health','bot_health_connection','bot_health_outbox','bot_health_qotd',
    'bot_health_cache','bot_health_features','bot_health_activity'
  ];
BEGIN
  v_defaults := CASE
    WHEN p_permission_level = 'full_admin' THEN
      '{
        "credentials":true,"server":true,"panels":true,"qotd":true,
        "session_logs":true,"role_permissions":true,"mod_logs_config":true,
        "mod_logs_view":true,"welcome_goodbye":true,"mod_notes":true,
        "bot_health":true,"bot_health_connection":true,"bot_health_outbox":true,
        "bot_health_qotd":true,"bot_health_cache":true,"bot_health_features":true,
        "bot_health_activity":true
      }'::jsonb
    WHEN p_permission_level = 'moderator' THEN
      '{
        "credentials":false,"server":false,"panels":true,"qotd":true,
        "session_logs":false,"role_permissions":false,"mod_logs_config":false,
        "mod_logs_view":false,"welcome_goodbye":false,"mod_notes":false,
        "bot_health":false,"bot_health_connection":false,"bot_health_outbox":false,
        "bot_health_qotd":false,"bot_health_cache":false,"bot_health_features":false,
        "bot_health_activity":false
      }'::jsonb
    ELSE
      '{
        "credentials":false,"server":false,"panels":false,"qotd":false,
        "session_logs":false,"role_permissions":false,"mod_logs_config":false,
        "mod_logs_view":false,"welcome_goodbye":false,"mod_notes":false,
        "bot_health":false,"bot_health_connection":false,"bot_health_outbox":false,
        "bot_health_qotd":false,"bot_health_cache":false,"bot_health_features":false,
        "bot_health_activity":false
      }'::jsonb
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
    AND e.key = ANY(v_valid_keys)
    AND lower(e.value) IN ('true','false');

  RETURN v_defaults || v_overrides;
END;
$$;

-- Resolve which bot-health panels a web session may view.
CREATE OR REPLACE FUNCTION skz_admin_bot_session_health_sections(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row skz_admin_web_sessions%ROWTYPE;
  v_features jsonb;
  v_sections jsonb := '[]'::jsonb;
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

  v_features := skz_admin_bot_features_for_user(v_row.discord_user_id, v_row.permission_level);

  IF v_row.permission_level = 'full_admin' THEN
    IF COALESCE((v_features->>'bot_health')::boolean, true) = false THEN
      RETURN '[]'::jsonb;
    END IF;
    v_sections := jsonb_build_array('summary');
    IF COALESCE((v_features->>'bot_health_connection')::boolean, true) THEN
      v_sections := v_sections || jsonb_build_array('connection');
    END IF;
    IF COALESCE((v_features->>'bot_health_outbox')::boolean, true) THEN
      v_sections := v_sections || jsonb_build_array('outbox');
    END IF;
    IF COALESCE((v_features->>'bot_health_qotd')::boolean, true) THEN
      v_sections := v_sections || jsonb_build_array('qotd');
    END IF;
    IF COALESCE((v_features->>'bot_health_cache')::boolean, true) THEN
      v_sections := v_sections || jsonb_build_array('cache');
    END IF;
    IF COALESCE((v_features->>'bot_health_features')::boolean, true) THEN
      v_sections := v_sections || jsonb_build_array('features');
    END IF;
    IF COALESCE((v_features->>'bot_health_activity')::boolean, true) THEN
      v_sections := v_sections || jsonb_build_array('activity');
    END IF;
    RETURN v_sections;
  END IF;

  IF COALESCE((v_features->>'bot_health')::boolean, false) IS NOT TRUE THEN
    RETURN '[]'::jsonb;
  END IF;

  v_sections := jsonb_build_array('summary');

  IF COALESCE((v_features->>'bot_health_connection')::boolean, false) THEN
    v_sections := v_sections || jsonb_build_array('connection');
  END IF;
  IF COALESCE((v_features->>'bot_health_outbox')::boolean, false) THEN
    v_sections := v_sections || jsonb_build_array('outbox');
  END IF;
  IF COALESCE((v_features->>'bot_health_qotd')::boolean, false) THEN
    v_sections := v_sections || jsonb_build_array('qotd');
  END IF;
  IF COALESCE((v_features->>'bot_health_cache')::boolean, false) THEN
    v_sections := v_sections || jsonb_build_array('cache');
  END IF;
  IF COALESCE((v_features->>'bot_health_features')::boolean, false) THEN
    v_sections := v_sections || jsonb_build_array('features');
  END IF;
  IF COALESCE((v_features->>'bot_health_activity')::boolean, false) THEN
    v_sections := v_sections || jsonb_build_array('activity');
  END IF;

  RETURN v_sections;
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_session_health_sections(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_bot_get_health(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sections jsonb;
  v_guild_id text;
  v_result jsonb := '{}'::jsonb;
  v_heartbeat timestamptz;
  v_started timestamptz;
  v_status text;
  v_age_seconds numeric;
BEGIN
  v_sections := skz_admin_bot_session_health_sections(p_session_token);
  IF v_sections IS NULL OR jsonb_array_length(v_sections) = 0 THEN
    RAISE EXCEPTION 'insufficient permission' USING ERRCODE = '42501';
  END IF;

  SELECT value INTO v_guild_id FROM skz_bot_settings WHERE key = 'guild_id' LIMIT 1;
  v_guild_id := COALESCE(NULLIF(trim(v_guild_id), ''), '');

  v_result := jsonb_build_object(
    'allowed_sections', v_sections,
    'fetched_at', to_jsonb(now())
  );

  -- Summary (always when bot_health is granted)
  IF v_sections @> '["summary"]'::jsonb THEN
    SELECT NULLIF(trim(value), '')::timestamptz INTO v_heartbeat
    FROM skz_bot_settings WHERE key = 'bot_heartbeat_at' LIMIT 1;
    SELECT NULLIF(trim(value), '')::timestamptz INTO v_started
    FROM skz_bot_settings WHERE key = 'bot_started_at' LIMIT 1;
    SELECT COALESCE(NULLIF(trim(value), ''), 'offline') INTO v_status
    FROM skz_bot_settings WHERE key = 'bot_ws_status' LIMIT 1;

    v_age_seconds := CASE
      WHEN v_heartbeat IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (now() - v_heartbeat))
    END;

    v_result := v_result || jsonb_build_object(
      'summary', jsonb_build_object(
        'ws_status', v_status,
        'heartbeat_at', v_heartbeat,
        'started_at', v_started,
        'heartbeat_age_seconds', v_age_seconds,
        'connection_state', CASE
          WHEN v_status = 'ready' AND v_heartbeat IS NOT NULL AND v_age_seconds <= 120 THEN 'online'
          WHEN v_status = 'ready' AND v_heartbeat IS NOT NULL AND v_age_seconds <= 300 THEN 'degraded'
          ELSE 'offline'
        END,
        'guild_id', v_guild_id
      )
    );
  END IF;

  IF v_sections @> '["connection"]'::jsonb THEN
    v_result := v_result || jsonb_build_object(
      'connection', (
        SELECT jsonb_build_object(
          'bot_discord_user_id', COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'bot_discord_user_id'), ''),
          'bot_username', COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'bot_username'), ''),
          'bot_global_name', COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'bot_global_name'), ''),
          'bot_avatar_hash', COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'bot_avatar_hash'), ''),
          'ws_status', COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'bot_ws_status'), 'offline'),
          'started_at', (SELECT NULLIF(trim(value), '')::timestamptz FROM skz_bot_settings WHERE key = 'bot_started_at' LIMIT 1),
          'heartbeat_at', (SELECT NULLIF(trim(value), '')::timestamptz FROM skz_bot_settings WHERE key = 'bot_heartbeat_at' LIMIT 1),
          'outbox_last_run_at', (SELECT NULLIF(trim(value), '')::timestamptz FROM skz_bot_settings WHERE key = 'bot_outbox_last_run_at' LIMIT 1),
          'qotd_last_check_at', (SELECT NULLIF(trim(value), '')::timestamptz FROM skz_bot_settings WHERE key = 'bot_qotd_last_check_at' LIMIT 1),
          'cache_synced_at', (SELECT NULLIF(trim(value), '')::timestamptz FROM skz_bot_settings WHERE key = 'bot_cache_synced_at' LIMIT 1)
        )
      )
    );
  END IF;

  IF v_sections @> '["outbox"]'::jsonb THEN
    v_result := v_result || jsonb_build_object(
      'outbox', jsonb_build_object(
        'pending', (SELECT count(*)::int FROM skz_bot_outbox WHERE status = 'pending'),
        'processing', (SELECT count(*)::int FROM skz_bot_outbox WHERE status = 'processing'),
        'failed', (SELECT count(*)::int FROM skz_bot_outbox WHERE status = 'failed'),
        'done_24h', (
          SELECT count(*)::int FROM skz_bot_outbox
          WHERE status = 'done' AND processed_at >= now() - interval '24 hours'
        ),
        'last_processed_at', (
          SELECT max(processed_at) FROM skz_bot_outbox WHERE processed_at IS NOT NULL
        ),
        'recent_failures', COALESCE((
          SELECT jsonb_agg(row_to_json(f)::jsonb ORDER BY f.created_at DESC)
          FROM (
            SELECT id, action, error, created_at, processed_at
            FROM skz_bot_outbox
            WHERE status = 'failed'
            ORDER BY created_at DESC
            LIMIT 8
          ) f
        ), '[]'::jsonb)
      )
    );
  END IF;

  IF v_sections @> '["qotd"]'::jsonb THEN
    v_result := v_result || jsonb_build_object(
      'qotd', jsonb_build_object(
        'enabled', lower(COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'qotd_enabled'), 'false')) = 'true',
        'channel_id', COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'qotd_channel_id'), ''),
        'post_hour_utc', COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'qotd_post_hour_utc'), '12'),
        'post_minute_utc', COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'qotd_post_minute_utc'), '0'),
        'last_check_at', (SELECT NULLIF(trim(value), '')::timestamptz FROM skz_bot_settings WHERE key = 'bot_qotd_last_check_at' LIMIT 1),
        'active_questions', (SELECT count(*)::int FROM skz_bot_daily_questions WHERE is_active),
        'total_questions', (SELECT count(*)::int FROM skz_bot_daily_questions),
        'recent_runs', COALESCE((
          SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC)
          FROM (
            SELECT run_date, question_type, status, error, channel_id, thread_id, created_at
            FROM skz_bot_daily_question_runs
            ORDER BY created_at DESC
            LIMIT 10
          ) r
        ), '[]'::jsonb)
      )
    );
  END IF;

  IF v_sections @> '["cache"]'::jsonb THEN
    v_result := v_result || jsonb_build_object(
      'cache', jsonb_build_object(
        'synced_at', (
          SELECT max(synced_at) FROM skz_bot_discord_cache
          WHERE guild_id = v_guild_id OR v_guild_id = ''
        ),
        'channels', (
          SELECT count(*)::int FROM skz_bot_discord_cache
          WHERE entity_type = 'channel'
            AND (guild_id = v_guild_id OR v_guild_id = '')
        ),
        'roles', (
          SELECT count(*)::int FROM skz_bot_discord_cache
          WHERE entity_type = 'role'
            AND (guild_id = v_guild_id OR v_guild_id = '')
        ),
        'members', (
          SELECT count(*)::int FROM skz_bot_discord_cache
          WHERE entity_type = 'member'
            AND (guild_id = v_guild_id OR v_guild_id = '')
        )
      )
    );
  END IF;

  IF v_sections @> '["features"]'::jsonb THEN
    v_result := v_result || jsonb_build_object(
      'features', jsonb_build_object(
        'qotd_enabled', lower(COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'qotd_enabled'), 'false')) = 'true',
        'mod_log_enabled', lower(COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'mod_log_enabled'), 'false')) = 'true',
        'welcome_enabled', lower(COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'welcome_enabled'), 'false')) = 'true',
        'goodbye_enabled', lower(COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'goodbye_enabled'), 'false')) = 'true',
        'account_age_gate_enabled', lower(COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'account_age_gate_enabled'), 'false')) = 'true',
        'content_filter_enabled', lower(COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'content_filter_enabled'), 'false')) = 'true',
        'join_to_create_configured', NULLIF(trim(COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'join_to_create_channel_id'), '')), '') IS NOT NULL,
        'guild_id_set', v_guild_id <> ''
      )
    );
  END IF;

  IF v_sections @> '["activity"]'::jsonb THEN
    v_result := v_result || jsonb_build_object(
      'activity', jsonb_build_object(
        'panels_total', (SELECT count(*)::int FROM skz_bot_messages),
        'panels_live', (SELECT count(*)::int FROM skz_bot_messages WHERE discord_message_id IS NOT NULL AND discord_message_id <> ''),
        'active_reaction_roles', (SELECT count(*)::int FROM skz_bot_reaction_roles WHERE is_active),
        'temp_voice_channels', (SELECT count(*)::int FROM skz_bot_temp_voice_channels WHERE guild_id = v_guild_id OR v_guild_id = ''),
        'mod_log_events_24h', (
          SELECT count(*)::int FROM skz_bot_mod_log_events
          WHERE created_at >= now() - interval '24 hours'
            AND (guild_id = v_guild_id OR v_guild_id = '')
        ),
        'security_actions_24h', (
          SELECT count(*)::int FROM skz_bot_moderation_actions
          WHERE created_at >= now() - interval '24 hours'
            AND (guild_id = v_guild_id OR v_guild_id = '')
        )
      )
    );
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_get_health(text) TO anon, authenticated;
