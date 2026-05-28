-- Extended admin RPCs: masked secrets, Discord cache reads, embed messages,
-- deploy queue.

CREATE OR REPLACE FUNCTION skz_bot_is_secret_key(p_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_key IN (
    'discord_token',
    'discord_client_id',
    'supabase_url',
    'supabase_service_role_key'
  );
$$;

CREATE OR REPLACE FUNCTION skz_bot_mask_setting(p_key text, p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN NOT skz_bot_is_secret_key(p_key) THEN COALESCE(p_value, '')
    WHEN COALESCE(trim(p_value), '') = '' THEN ''
    ELSE '__SECRET_SET__'
  END;
$$;

-- ── Read config bundle ──
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
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(
      key,
      skz_bot_mask_setting(key, value)
    ),
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
      bot_message_id,
      channel_id,
      message_id,
      emoji,
      button_emoji,
      role_id,
      category,
      label,
      button_style,
      remove_on_unreact,
      sort_order,
      is_active,
      created_at,
      updated_at
    FROM skz_bot_reaction_roles
  ) r;

  SELECT COALESCE(
    jsonb_agg(row_to_json(m)::jsonb ORDER BY m.sort_order, m.label),
    '[]'::jsonb
  ) INTO v_messages
  FROM (
    SELECT
      id,
      slug,
      label,
      kind,
      channel_id,
      discord_message_id,
      embed,
      interaction_mode,
      is_active,
      sort_order,
      created_at,
      updated_at
    FROM skz_bot_messages
  ) m;

  SELECT COALESCE(
    jsonb_agg(row_to_json(c)::jsonb ORDER BY c.entity_type, c.position, c.name),
    '[]'::jsonb
  ) INTO v_discord_cache
  FROM (
    SELECT
      entity_type,
      entity_id,
      name,
      parent_id,
      channel_type,
      position,
      synced_at
    FROM skz_bot_discord_cache
    WHERE guild_id = COALESCE(
      (SELECT value FROM skz_bot_settings WHERE key = 'guild_id' LIMIT 1),
      ''
    )
  ) c;

  RETURN jsonb_build_object(
    'settings', v_settings,
    'reaction_roles', v_reaction_roles,
    'messages', v_messages,
    'discord_cache', v_discord_cache
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_get_config(text) TO anon, authenticated;


-- ── Bulk settings save (skip masked secret placeholders) ──
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
    IF length(trim(v_key)) = 0 THEN CONTINUE; END IF;
    IF skz_bot_is_secret_key(trim(v_key)) AND v_value = '__SECRET_SET__' THEN
      CONTINUE;
    END IF;
    INSERT INTO skz_bot_settings (key, value)
    VALUES (trim(v_key), COALESCE(v_value, ''))
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = now();
  END LOOP;

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_set_settings(text, jsonb) TO anon, authenticated;


-- ── Discord cache list (filtered) ──
CREATE OR REPLACE FUNCTION skz_admin_bot_list_discord_entities(
  p_code text,
  p_entity_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id text;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  SELECT value INTO v_guild_id FROM skz_bot_settings WHERE key = 'guild_id' LIMIT 1;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.position, r.name)
    FROM (
      SELECT entity_type, entity_id, name, parent_id, channel_type, position, synced_at
      FROM skz_bot_discord_cache
      WHERE guild_id = COALESCE(v_guild_id, '')
        AND (p_entity_type IS NULL OR entity_type = p_entity_type)
    ) r
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_list_discord_entities(text, text) TO anon, authenticated;


-- ── Bot messages CRUD ──
CREATE OR REPLACE FUNCTION skz_admin_bot_upsert_message(
  p_code text,
  p_id uuid DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_label text DEFAULT '',
  p_kind text DEFAULT 'reaction_roles',
  p_channel_id text DEFAULT '',
  p_embed jsonb DEFAULT '{}',
  p_interaction_mode text DEFAULT 'reaction',
  p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_slug text;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  v_slug := NULLIF(trim(p_slug), '');
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'slug required';
  END IF;

  IF p_kind NOT IN ('verify', 'reaction_roles', 'general') THEN
    RAISE EXCEPTION 'invalid kind';
  END IF;

  IF p_interaction_mode NOT IN ('reaction', 'button', 'both') THEN
    RAISE EXCEPTION 'invalid interaction_mode';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO skz_bot_messages (
      slug, label, kind, channel_id, embed, interaction_mode, is_active
    ) VALUES (
      v_slug,
      COALESCE(trim(p_label), ''),
      p_kind,
      COALESCE(trim(p_channel_id), ''),
      COALESCE(p_embed, '{}'::jsonb),
      p_interaction_mode,
      COALESCE(p_is_active, true)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE skz_bot_messages
    SET
      slug = v_slug,
      label = COALESCE(trim(p_label), label),
      kind = p_kind,
      channel_id = COALESCE(NULLIF(trim(p_channel_id), ''), channel_id),
      embed = COALESCE(p_embed, embed),
      interaction_mode = p_interaction_mode,
      is_active = COALESCE(p_is_active, is_active),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'message not found: %', p_id;
    END IF;
  END IF;

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_upsert_message(
  text, uuid, text, text, text, text, jsonb, text, boolean
) TO anon, authenticated;


CREATE OR REPLACE FUNCTION skz_admin_bot_delete_message(
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

  DELETE FROM skz_bot_messages WHERE id = p_id;
  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_delete_message(text, uuid) TO anon, authenticated;


-- ── Queue deploy / cache sync for the bot to pick up ──
CREATE OR REPLACE FUNCTION skz_admin_bot_queue_action(
  p_code text,
  p_action text,
  p_payload jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  IF p_action NOT IN ('DEPLOY_MESSAGE', 'SYNC_GUILD_CACHE') THEN
    RAISE EXCEPTION 'invalid action';
  END IF;

  INSERT INTO skz_bot_outbox (action, payload)
  VALUES (p_action, COALESCE(p_payload, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_queue_action(text, text, jsonb) TO anon, authenticated;


-- ── Reaction role create/update with bot_message_id + button fields ──
CREATE OR REPLACE FUNCTION skz_admin_bot_create_reaction_role(
  p_code text,
  p_channel_id text,
  p_message_id text,
  p_emoji text,
  p_role_id text,
  p_category text DEFAULT 'general',
  p_label text DEFAULT '',
  p_remove_on_unreact boolean DEFAULT true,
  p_bot_message_id uuid DEFAULT NULL,
  p_button_style text DEFAULT NULL,
  p_button_emoji text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category text;
  v_next_order int;
  v_channel text;
  v_message text;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(trim(p_emoji), '') IS NULL THEN RAISE EXCEPTION 'emoji required'; END IF;
  IF NULLIF(trim(p_role_id), '') IS NULL THEN RAISE EXCEPTION 'role_id required'; END IF;

  v_category := COALESCE(NULLIF(trim(p_category), ''), 'general');

  -- Resolve channel/message from linked bot message when provided.
  IF p_bot_message_id IS NOT NULL THEN
    SELECT channel_id, COALESCE(discord_message_id, '')
      INTO v_channel, v_message
      FROM skz_bot_messages WHERE id = p_bot_message_id;
    IF v_channel IS NULL THEN
      RAISE EXCEPTION 'bot message not found';
    END IF;
  ELSE
    v_channel := trim(p_channel_id);
    v_message := trim(p_message_id);
    IF v_channel IS NULL OR v_channel = '' THEN RAISE EXCEPTION 'channel_id required'; END IF;
    IF v_message IS NULL OR v_message = '' THEN RAISE EXCEPTION 'message_id required'; END IF;
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 10 INTO v_next_order
  FROM skz_bot_reaction_roles WHERE category = v_category;

  INSERT INTO skz_bot_reaction_roles (
    bot_message_id, channel_id, message_id, emoji, button_emoji, role_id,
    category, label, button_style, remove_on_unreact, sort_order
  ) VALUES (
    p_bot_message_id,
    v_channel,
    v_message,
    trim(p_emoji),
    COALESCE(trim(p_button_emoji), ''),
    trim(p_role_id),
    v_category,
    COALESCE(trim(p_label), ''),
    p_button_style,
    COALESCE(p_remove_on_unreact, true),
    v_next_order
  );

  RETURN skz_admin_bot_get_config(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_create_reaction_role(
  text, text, text, text, text, text, text, boolean, uuid, text, text
) TO anon, authenticated;


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
  p_is_active boolean DEFAULT NULL,
  p_bot_message_id uuid DEFAULT NULL,
  p_button_style text DEFAULT NULL,
  p_button_emoji text DEFAULT NULL
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

  UPDATE skz_bot_reaction_roles
  SET
    bot_message_id    = COALESCE(p_bot_message_id, bot_message_id),
    channel_id        = COALESCE(NULLIF(trim(p_channel_id), ''), channel_id),
    message_id        = COALESCE(NULLIF(trim(p_message_id), ''), message_id),
    emoji             = COALESCE(NULLIF(trim(p_emoji), ''), emoji),
    button_emoji      = COALESCE(p_button_emoji, button_emoji),
    role_id           = COALESCE(NULLIF(trim(p_role_id), ''), role_id),
    category          = COALESCE(NULLIF(trim(p_category), ''), category),
    label             = COALESCE(p_label, label),
    button_style      = COALESCE(p_button_style, button_style),
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
  text, uuid, text, text, text, text, text, text, boolean, boolean, uuid, text, text
) TO anon, authenticated;
