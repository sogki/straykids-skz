-- Rerun safety helpers for manual SQL execution.
-- Safe to run multiple times.

DROP POLICY IF EXISTS skz_admin_discord_role_permissions_service ON skz_admin_discord_role_permissions;
DROP POLICY IF EXISTS skz_admin_discord_member_roles_cache_service ON skz_admin_discord_member_roles_cache;
DROP POLICY IF EXISTS skz_admin_discord_login_codes_service ON skz_admin_discord_login_codes;
DROP POLICY IF EXISTS skz_admin_web_sessions_service ON skz_admin_web_sessions;

-- Recreate the policies by re-running the main migrations after this:
--   20260528000006_skz_admin_discord_auth_rbac.sql
--   20260528000007_skz_admin_discord_bot_login.sql
--   20260528000008_skz_admin_session_logs.sql
--   20260528000009_fix_admin_token_generation.sql
