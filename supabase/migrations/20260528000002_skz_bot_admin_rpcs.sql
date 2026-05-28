-- Admin RPCs for managing the Discord bot's config from the SKZ admin panel.
--
-- All gated on skz_admin_code_valid(p_code) — same pattern as
-- skz_admin_list_games etc. Granted to anon + authenticated since the
-- admin panel hits them via the standard supabase client.

-- ─────────────────────────────────────────────
-- Read: bundle settings + reaction roles in one call
-- ─────────────────────────────────────────────
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
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(key, value),
    '{}'::jsonb
  ) INTO v_settings
  FROM skz_bot_settings;

  SELECT COALESCE(
    jsonb_agg(row_to_json(r)::jsonb ORDER BY r.category, r.sort_order, r.label),
    '[]'::jsonb
  ) INTO v_reaction_roles
  FROM (
    SELECT
      id,
      channel_id,
      message_id,
      emoji,
      role_id,
      category,
      label,
      remove_on_unreact,
      sort_order,
      is_active,
      created_at,
      updated_at
    FROM skz_bot_reaction_roles
  ) r;

  RETURN jsonb_build_object(
    'settings', v_settings,
    'reaction_roles', v_reaction_roles
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_get_config(text) TO anon, authenticated;


-- ─────────────────────────────────────────────
-- Settings: upsert a single key/value
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION skz_admin_bot_set_setting(
  p_code text,
  p_key  text,
  p_value text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  v_key := NULLIF(trim(p_key), '');
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'key required';
  END IF;

  INSERT INTO skz_bot_settings (key, value)
  VALUES (v_key, COALESCE(p_value, ''))
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_set_setting(text, text, text) TO anon, authenticated;


-- ─────────────────────────────────────────────
-- Settings: bulk upsert (admin form save-all)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION skz_admin_bot_set_settings(
  p_code text,
  p_settings jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_value text;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  IF p_settings IS NULL OR jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'settings must be a json object';
  END IF;

  FOR v_key, v_value IN
    SELECT key, COALESCE(value #>> '{}', '') FROM jsonb_each(p_settings)
  LOOP
    IF length(trim(v_key)) > 0 THEN
      INSERT INTO skz_bot_settings (key, value)
      VALUES (trim(v_key), COALESCE(v_value, ''))
      ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = now();
    END IF;
  END LOOP;

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_set_settings(text, jsonb) TO anon, authenticated;


-- ─────────────────────────────────────────────
-- Reaction roles: create
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION skz_admin_bot_create_reaction_role(
  p_code text,
  p_channel_id text,
  p_message_id text,
  p_emoji text,
  p_role_id text,
  p_category text DEFAULT 'general',
  p_label text DEFAULT '',
  p_remove_on_unreact boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category text;
  v_next_order int;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(trim(p_channel_id), '') IS NULL THEN RAISE EXCEPTION 'channel_id required'; END IF;
  IF NULLIF(trim(p_message_id), '') IS NULL THEN RAISE EXCEPTION 'message_id required'; END IF;
  IF NULLIF(trim(p_emoji), '')      IS NULL THEN RAISE EXCEPTION 'emoji required';      END IF;
  IF NULLIF(trim(p_role_id), '')    IS NULL THEN RAISE EXCEPTION 'role_id required';    END IF;

  v_category := COALESCE(NULLIF(trim(p_category), ''), 'general');
  IF v_category NOT IN ('verify', 'pronouns', 'colors', 'general', 'other') THEN
    RAISE EXCEPTION 'invalid category: %', v_category;
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 10
    INTO v_next_order
    FROM skz_bot_reaction_roles
    WHERE category = v_category;

  INSERT INTO skz_bot_reaction_roles (
    channel_id, message_id, emoji, role_id, category, label,
    remove_on_unreact, sort_order
  ) VALUES (
    trim(p_channel_id),
    trim(p_message_id),
    trim(p_emoji),
    trim(p_role_id),
    v_category,
    COALESCE(trim(p_label), ''),
    COALESCE(p_remove_on_unreact, true),
    v_next_order
  );

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_create_reaction_role(
  text, text, text, text, text, text, text, boolean
) TO anon, authenticated;


-- ─────────────────────────────────────────────
-- Reaction roles: update
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION skz_admin_bot_update_reaction_role(
  p_code text,
  p_id uuid,
  p_channel_id text DEFAULT NULL,
  p_message_id text DEFAULT NULL,
  p_emoji text DEFAULT NULL,
  p_role_id text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_label text DEFAULT NULL,
  p_remove_on_unreact boolean DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
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

  IF p_category IS NOT NULL
     AND p_category NOT IN ('verify', 'pronouns', 'colors', 'general', 'other') THEN
    RAISE EXCEPTION 'invalid category: %', p_category;
  END IF;

  UPDATE skz_bot_reaction_roles
  SET
    channel_id        = COALESCE(NULLIF(trim(p_channel_id), ''), channel_id),
    message_id        = COALESCE(NULLIF(trim(p_message_id), ''), message_id),
    emoji             = COALESCE(NULLIF(trim(p_emoji), ''), emoji),
    role_id           = COALESCE(NULLIF(trim(p_role_id), ''), role_id),
    category          = COALESCE(NULLIF(trim(p_category), ''), category),
    label             = COALESCE(p_label, label),
    remove_on_unreact = COALESCE(p_remove_on_unreact, remove_on_unreact),
    is_active         = COALESCE(p_is_active, is_active),
    updated_at        = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reaction role not found: %', p_id;
  END IF;

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_update_reaction_role(
  text, uuid, text, text, text, text, text, text, boolean, boolean
) TO anon, authenticated;


-- ─────────────────────────────────────────────
-- Reaction roles: delete
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION skz_admin_bot_delete_reaction_role(
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

  DELETE FROM skz_bot_reaction_roles WHERE id = p_id;

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_delete_reaction_role(text, uuid)
  TO anon, authenticated;
