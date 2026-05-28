-- Enrich mod log list for admin panel: resolve channel names from Discord cache.

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
        ev.id,
        ev.guild_id,
        ev.event_type,
        ev.channel_id,
        ev.actor_user_id,
        ev.target_user_id,
        ev.message_id,
        ev.payload,
        ev.created_at,
        dc.name AS channel_name
      FROM skz_bot_mod_log_events ev
      LEFT JOIN skz_bot_discord_cache dc
        ON dc.guild_id = ev.guild_id
        AND dc.entity_type = 'channel'
        AND dc.entity_id = ev.channel_id
      WHERE ev.guild_id = COALESCE(NULLIF(trim(v_guild_id), ''), ev.guild_id)
        AND (
          p_event_type IS NULL
          OR NULLIF(trim(p_event_type), '') IS NULL
          OR ev.event_type = trim(p_event_type)
        )
      ORDER BY ev.created_at DESC
      LIMIT v_limit
    ) e
  ), '[]'::jsonb);
END;
$$;
