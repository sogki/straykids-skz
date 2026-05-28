-- Discord OAuth admin auth + RBAC
-- Full admins keep access to all existing admin features.
-- Moderators are limited to Discord bot section (UI-gated).

CREATE TABLE IF NOT EXISTS skz_admin_discord_role_permissions (
  discord_role_id text PRIMARY KEY,
  permission_level text NOT NULL CHECK (permission_level IN ('full_admin', 'moderator')),
  label text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS skz_admin_discord_role_permissions_updated_at
  ON skz_admin_discord_role_permissions;
CREATE TRIGGER skz_admin_discord_role_permissions_updated_at
  BEFORE UPDATE ON skz_admin_discord_role_permissions
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();

CREATE TABLE IF NOT EXISTS skz_admin_discord_member_roles_cache (
  discord_user_id text PRIMARY KEY,
  guild_id text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role_ids text[] NOT NULL DEFAULT '{}',
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skz_admin_discord_member_roles_cache_guild_idx
  ON skz_admin_discord_member_roles_cache (guild_id, synced_at DESC);

ALTER TABLE skz_admin_discord_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_admin_discord_member_roles_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skz_admin_discord_role_permissions_service ON skz_admin_discord_role_permissions;
CREATE POLICY skz_admin_discord_role_permissions_service ON skz_admin_discord_role_permissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS skz_admin_discord_member_roles_cache_service ON skz_admin_discord_member_roles_cache;
CREATE POLICY skz_admin_discord_member_roles_cache_service ON skz_admin_discord_member_roles_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION skz_admin_discord_user_id_for_auth_user(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT identity_data->>'sub'
  FROM auth.identities
  WHERE user_id = p_user_id
    AND provider = 'discord'
  ORDER BY created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION skz_admin_discord_user_id_for_auth_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION skz_admin_discord_user_id_for_auth_user(uuid) TO anon, authenticated, service_role;

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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'permission_level', 'none',
      'allowed_sections', '[]'::jsonb
    );
  END IF;

  v_discord_user_id := skz_admin_discord_user_id_for_auth_user(v_user_id);
  IF v_discord_user_id IS NULL OR v_discord_user_id = '' THEN
    RETURN jsonb_build_object(
      'authenticated', true,
      'permission_level', 'none',
      'allowed_sections', '[]'::jsonb
    );
  END IF;

  SELECT guild_id, display_name, role_ids
    INTO v_guild_id, v_display_name, v_role_ids
  FROM skz_admin_discord_member_roles_cache
  WHERE discord_user_id = v_discord_user_id;

  IF EXISTS (
    SELECT 1
    FROM skz_admin_discord_role_permissions rp
    WHERE rp.is_active
      AND rp.permission_level = 'full_admin'
      AND rp.discord_role_id = ANY(COALESCE(v_role_ids, '{}'::text[]))
  ) THEN
    v_permission := 'full_admin';
    v_sections := '["dashboard","banner","analytics","leaderboard","games","requests","bot"]'::jsonb;
  ELSIF EXISTS (
    SELECT 1
    FROM skz_admin_discord_role_permissions rp
    WHERE rp.is_active
      AND rp.permission_level = 'moderator'
      AND rp.discord_role_id = ANY(COALESCE(v_role_ids, '{}'::text[]))
  ) THEN
    v_permission := 'moderator';
    v_sections := '["bot"]'::jsonb;
  ELSIF EXISTS (
    SELECT 1
    FROM skz_admin_discord_role_permissions rp
    WHERE rp.is_active
      AND rp.permission_level = 'member'
      AND rp.discord_role_id = ANY(COALESCE(v_role_ids, '{}'::text[]))
  ) THEN
    v_permission := 'member';
    v_sections := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'permission_level', v_permission,
    'allowed_sections', v_sections,
    'discord_user_id', v_discord_user_id,
    'discord_display_name', COALESCE(v_display_name, ''),
    'guild_id', COALESCE(v_guild_id, '')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_get_my_access() TO authenticated;

CREATE OR REPLACE FUNCTION skz_admin_get_legacy_staff_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access jsonb;
  v_code text;
BEGIN
  v_access := skz_admin_get_my_access();
  IF COALESCE(v_access->>'permission_level', 'none') <> 'full_admin' THEN
    RAISE EXCEPTION 'insufficient permission' USING ERRCODE = '42501';
  END IF;

  SELECT staff_code INTO v_code FROM skz_admin_staff WHERE id = 1;
  IF v_code IS NULL OR trim(v_code) = '' THEN
    RAISE EXCEPTION 'staff code is not configured';
  END IF;

  RETURN trim(v_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_get_legacy_staff_code() TO authenticated;
