-- Full-admin session logs view for Discord/bot admin authentication.

CREATE OR REPLACE FUNCTION skz_admin_list_web_sessions(
  p_session_token text,
  p_limit int DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor skz_admin_web_sessions%ROWTYPE;
  v_limit int;
BEGIN
  SELECT * INTO v_actor
  FROM skz_admin_web_sessions
  WHERE session_token = trim(p_session_token)
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND OR v_actor.permission_level <> 'full_admin' THEN
    RAISE EXCEPTION 'insufficient permission' USING ERRCODE = '42501';
  END IF;

  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 200), 1000));

  RETURN COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'session_token', s.session_token,
        'discord_user_id', s.discord_user_id,
        'display_name', s.display_name,
        'permission_level', s.permission_level,
        'created_at', s.created_at,
        'expires_at', s.expires_at,
        'revoked_at', s.revoked_at,
        'ended_at', COALESCE(s.revoked_at, CASE WHEN s.expires_at <= now() THEN s.expires_at ELSE NULL END),
        'duration_seconds', GREATEST(
          0,
          EXTRACT(
            EPOCH FROM (
              COALESCE(s.revoked_at, CASE WHEN s.expires_at <= now() THEN s.expires_at ELSE now() END) - s.created_at
            )
          )::bigint
        ),
        'status', CASE
          WHEN s.revoked_at IS NOT NULL THEN 'revoked'
          WHEN s.expires_at <= now() THEN 'expired'
          ELSE 'active'
        END
      )
      ORDER BY s.created_at DESC
    )
    FROM (
      SELECT *
      FROM skz_admin_web_sessions
      ORDER BY created_at DESC
      LIMIT v_limit
    ) s
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_list_web_sessions(text, int) TO anon, authenticated;
