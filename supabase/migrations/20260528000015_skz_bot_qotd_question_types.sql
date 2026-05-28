-- QOTD question types: standard, would_you_rather, throwback_thursday.

ALTER TABLE skz_bot_daily_questions
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'standard';

ALTER TABLE skz_bot_daily_questions
  DROP CONSTRAINT IF EXISTS skz_bot_daily_questions_question_type_check;

ALTER TABLE skz_bot_daily_questions
  ADD CONSTRAINT skz_bot_daily_questions_question_type_check
  CHECK (question_type IN ('standard', 'would_you_rather', 'throwback_thursday'));

CREATE OR REPLACE FUNCTION skz_normalize_qotd_question_type(p_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE lower(trim(COALESCE(p_type, '')))
    WHEN 'would_you_rather' THEN 'would_you_rather'
    WHEN 'wyr' THEN 'would_you_rather'
    WHEN 'would-you-rather' THEN 'would_you_rather'
    WHEN 'throwback_thursday' THEN 'throwback_thursday'
    WHEN 'throwback' THEN 'throwback_thursday'
    WHEN 'tbt' THEN 'throwback_thursday'
    WHEN 'throwback-thursday' THEN 'throwback_thursday'
    ELSE 'standard'
  END;
END;
$$;

-- Extend get_config (latest version from feature toggles migration).
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
  v_role_permissions jsonb;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_object_agg(key, skz_bot_mask_setting(key, value)), '{}'::jsonb)
  INTO v_settings
  FROM skz_bot_settings;

  SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.category, r.sort_order, r.label), '[]'::jsonb)
  INTO v_reaction_roles
  FROM (
    SELECT id, bot_message_id, channel_id, message_id, emoji, button_emoji, role_id, category, label,
           button_style, remove_on_unreact, sort_order, is_active, created_at, updated_at
    FROM skz_bot_reaction_roles
  ) r;

  SELECT COALESCE(jsonb_agg(row_to_json(m)::jsonb ORDER BY m.sort_order, m.label), '[]'::jsonb)
  INTO v_messages
  FROM (
    SELECT id, slug, label, kind, channel_id, discord_message_id, embed, interaction_mode, is_active, sort_order, created_at, updated_at
    FROM skz_bot_messages
  ) m;

  SELECT COALESCE(jsonb_agg(row_to_json(c)::jsonb ORDER BY c.entity_type, c.position, c.name), '[]'::jsonb)
  INTO v_discord_cache
  FROM (
    SELECT entity_type, entity_id, name, parent_id, channel_type, position, synced_at
    FROM skz_bot_discord_cache
    WHERE guild_id = COALESCE((SELECT value FROM skz_bot_settings WHERE key = 'guild_id' LIMIT 1), '')
  ) c;

  SELECT COALESCE(jsonb_agg(row_to_json(q)::jsonb ORDER BY q.sort_order, q.created_at), '[]'::jsonb)
  INTO v_daily_questions
  FROM (
    SELECT id, prompt, question_type, is_active, sort_order, last_posted_at, post_count, created_at, updated_at
    FROM skz_bot_daily_questions
  ) q;

  SELECT COALESCE(jsonb_agg(row_to_json(p)::jsonb ORDER BY p.permission_level, p.label), '[]'::jsonb)
  INTO v_role_permissions
  FROM (
    SELECT discord_role_id, permission_level, label, is_active, bot_feature_access, created_at, updated_at
    FROM skz_admin_discord_role_permissions
  ) p;

  RETURN jsonb_build_object(
    'settings', v_settings,
    'reaction_roles', v_reaction_roles,
    'messages', v_messages,
    'discord_cache', v_discord_cache,
    'daily_questions', v_daily_questions,
    'role_permissions', v_role_permissions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_get_config(text) TO anon, authenticated;

DROP FUNCTION IF EXISTS skz_admin_bot_create_daily_question(text, text, boolean);
DROP FUNCTION IF EXISTS skz_admin_bot_update_daily_question(text, uuid, text, boolean, int);

CREATE OR REPLACE FUNCTION skz_admin_bot_create_daily_question(
  p_code text,
  p_prompt text,
  p_is_active boolean DEFAULT true,
  p_question_type text DEFAULT 'standard'
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
  INSERT INTO skz_bot_daily_questions (prompt, question_type, is_active, sort_order)
  VALUES (
    trim(p_prompt),
    skz_normalize_qotd_question_type(p_question_type),
    COALESCE(p_is_active, true),
    v_next_order
  );

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;
GRANT EXECUTE ON FUNCTION skz_admin_bot_create_daily_question(text, text, boolean, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_bot_update_daily_question(
  p_code text,
  p_id uuid,
  p_prompt text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_sort_order int DEFAULT NULL,
  p_question_type text DEFAULT NULL
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
    question_type = CASE
      WHEN p_question_type IS NULL THEN question_type
      ELSE skz_normalize_qotd_question_type(p_question_type)
    END,
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
GRANT EXECUTE ON FUNCTION skz_admin_bot_update_daily_question(text, uuid, text, boolean, int, text) TO anon, authenticated;
