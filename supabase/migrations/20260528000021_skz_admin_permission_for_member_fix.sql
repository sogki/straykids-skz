-- Repair migration 20: GRANT used (text, text) but the second arg is text[].

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
