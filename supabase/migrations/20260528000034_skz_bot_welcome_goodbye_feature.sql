-- RBAC: welcome & goodbye config (full admin by default).

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
      '{"credentials":true,"server":true,"panels":true,"qotd":true,"session_logs":true,"role_permissions":true,"mod_logs_config":true,"mod_logs_view":true,"welcome_goodbye":true}'::jsonb
    WHEN p_permission_level = 'moderator' THEN
      '{"credentials":false,"server":false,"panels":true,"qotd":true,"session_logs":false,"role_permissions":false,"mod_logs_config":false,"mod_logs_view":false,"welcome_goodbye":false}'::jsonb
    ELSE
      '{"credentials":false,"server":false,"panels":false,"qotd":false,"session_logs":false,"role_permissions":false,"mod_logs_config":false,"mod_logs_view":false,"welcome_goodbye":false}'::jsonb
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
      'mod_logs_config','mod_logs_view','welcome_goodbye'
    )
    AND lower(e.value) IN ('true','false');

  RETURN v_defaults || v_overrides;
END;
$$;
