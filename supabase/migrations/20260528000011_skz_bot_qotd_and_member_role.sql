-- QOTD automation + member permission level support.

-- 1) Expand permission-level enums/checks to include "member".
ALTER TABLE skz_admin_discord_role_permissions
  DROP CONSTRAINT IF EXISTS skz_admin_discord_role_permissions_permission_level_check;
ALTER TABLE skz_admin_discord_role_permissions
  ADD CONSTRAINT skz_admin_discord_role_permissions_permission_level_check
  CHECK (permission_level IN ('full_admin', 'moderator', 'member'));

ALTER TABLE skz_admin_discord_login_codes
  DROP CONSTRAINT IF EXISTS skz_admin_discord_login_codes_permission_level_check;
ALTER TABLE skz_admin_discord_login_codes
  ADD CONSTRAINT skz_admin_discord_login_codes_permission_level_check
  CHECK (permission_level IN ('full_admin', 'moderator', 'member'));

ALTER TABLE skz_admin_web_sessions
  DROP CONSTRAINT IF EXISTS skz_admin_web_sessions_permission_level_check;
ALTER TABLE skz_admin_web_sessions
  ADD CONSTRAINT skz_admin_web_sessions_permission_level_check
  CHECK (permission_level IN ('full_admin', 'moderator', 'member'));

CREATE OR REPLACE FUNCTION skz_admin_permission_from_roles(p_role_ids text[])
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM skz_admin_discord_role_permissions rp
    WHERE rp.is_active
      AND rp.permission_level = 'full_admin'
      AND rp.discord_role_id = ANY(COALESCE(p_role_ids, '{}'::text[]))
  ) THEN
    RETURN 'full_admin';
  END IF;

  IF EXISTS (
    SELECT 1 FROM skz_admin_discord_role_permissions rp
    WHERE rp.is_active
      AND rp.permission_level = 'moderator'
      AND rp.discord_role_id = ANY(COALESCE(p_role_ids, '{}'::text[]))
  ) THEN
    RETURN 'moderator';
  END IF;

  IF EXISTS (
    SELECT 1 FROM skz_admin_discord_role_permissions rp
    WHERE rp.is_active
      AND rp.permission_level = 'member'
      AND rp.discord_role_id = ANY(COALESCE(p_role_ids, '{}'::text[]))
  ) THEN
    RETURN 'member';
  END IF;

  RETURN 'none';
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_permission_from_roles(text[]) TO anon, authenticated, service_role;

-- 2) Daily Questions storage.
CREATE TABLE IF NOT EXISTS skz_bot_daily_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  last_posted_at timestamptz,
  post_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skz_bot_daily_questions_active_idx
  ON skz_bot_daily_questions (is_active, sort_order, created_at);

DROP TRIGGER IF EXISTS skz_bot_daily_questions_updated_at ON skz_bot_daily_questions;
CREATE TRIGGER skz_bot_daily_questions_updated_at
  BEFORE UPDATE ON skz_bot_daily_questions
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();

CREATE TABLE IF NOT EXISTS skz_bot_daily_question_runs (
  run_date date PRIMARY KEY,
  question_id uuid REFERENCES skz_bot_daily_questions(id) ON DELETE SET NULL,
  channel_id text NOT NULL,
  message_id text,
  thread_id text,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'failed', 'skipped')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE skz_bot_daily_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_bot_daily_question_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY skz_bot_daily_questions_service ON skz_bot_daily_questions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY skz_bot_daily_question_runs_service ON skz_bot_daily_question_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO skz_bot_settings (key, value, description)
VALUES
  ('qotd_enabled', 'false', 'Enable daily question automation'),
  ('qotd_channel_id', '', 'Target channel for daily question post'),
  ('qotd_post_hour_utc', '12', 'UTC hour (0-23) for daily question'),
  ('qotd_post_minute_utc', '0', 'UTC minute (0-59) for daily question'),
  ('qotd_thread_name_format', 'QOTD • {date}', 'Thread title format ({date})')
ON CONFLICT (key) DO NOTHING;

-- 3) Extend bot admin config RPC output with daily questions.
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
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(key, skz_bot_mask_setting(key, value)),
    '{}'::jsonb
  ) INTO v_settings
  FROM skz_bot_settings;

  SELECT COALESCE(
    jsonb_agg(row_to_json(r)::jsonb ORDER BY r.category, r.sort_order, r.label),
    '[]'::jsonb
  ) INTO v_reaction_roles
  FROM (
    SELECT id, bot_message_id, channel_id, message_id, emoji, button_emoji, role_id, category, label,
           button_style, remove_on_unreact, sort_order, is_active, created_at, updated_at
    FROM skz_bot_reaction_roles
  ) r;

  SELECT COALESCE(
    jsonb_agg(row_to_json(m)::jsonb ORDER BY m.sort_order, m.label),
    '[]'::jsonb
  ) INTO v_messages
  FROM (
    SELECT id, slug, label, kind, channel_id, discord_message_id, embed, interaction_mode, is_active, sort_order, created_at, updated_at
    FROM skz_bot_messages
  ) m;

  SELECT COALESCE(
    jsonb_agg(row_to_json(c)::jsonb ORDER BY c.entity_type, c.position, c.name),
    '[]'::jsonb
  ) INTO v_discord_cache
  FROM (
    SELECT entity_type, entity_id, name, parent_id, channel_type, position, synced_at
    FROM skz_bot_discord_cache
    WHERE guild_id = COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'guild_id' LIMIT 1), '')
  ) c;

  SELECT COALESCE(
    jsonb_agg(row_to_json(q)::jsonb ORDER BY q.sort_order, q.created_at),
    '[]'::jsonb
  ) INTO v_daily_questions
  FROM (
    SELECT id, prompt, is_active, sort_order, last_posted_at, post_count, created_at, updated_at
    FROM skz_bot_daily_questions
  ) q;

  RETURN jsonb_build_object(
    'settings', v_settings,
    'reaction_roles', v_reaction_roles,
    'messages', v_messages,
    'discord_cache', v_discord_cache,
    'daily_questions', v_daily_questions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_get_config(text) TO anon, authenticated;

-- 4) Daily question CRUD RPCs (staff-code protected like existing bot admin RPCs).
CREATE OR REPLACE FUNCTION skz_admin_bot_create_daily_question(
  p_code text,
  p_prompt text,
  p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_order int;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(trim(p_prompt), '') IS NULL THEN
    RAISE EXCEPTION 'prompt required';
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 10 INTO v_next_order FROM skz_bot_daily_questions;
  INSERT INTO skz_bot_daily_questions (prompt, is_active, sort_order)
  VALUES (trim(p_prompt), COALESCE(p_is_active, true), v_next_order);

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;
GRANT EXECUTE ON FUNCTION skz_admin_bot_create_daily_question(text, text, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_bot_update_daily_question(
  p_code text,
  p_id uuid,
  p_prompt text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_sort_order int DEFAULT NULL
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

  UPDATE skz_bot_daily_questions
  SET
    prompt = COALESCE(NULLIF(trim(p_prompt), ''), prompt),
    is_active = COALESCE(p_is_active, is_active),
    sort_order = COALESCE(p_sort_order, sort_order),
    updated_at = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'daily question not found: %', p_id;
  END IF;

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;
GRANT EXECUTE ON FUNCTION skz_admin_bot_update_daily_question(text, uuid, text, boolean, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_bot_delete_daily_question(
  p_code text,
  p_id uuid
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

  DELETE FROM skz_bot_daily_questions WHERE id = p_id;
  RETURN skz_admin_bot_get_config(p_code);
END;
$$;
GRANT EXECUTE ON FUNCTION skz_admin_bot_delete_daily_question(text, uuid) TO anon, authenticated;
