-- discord_client_secret must be masked like other credentials, and must not be
-- wiped when admin saves settings without re-entering it.

CREATE OR REPLACE FUNCTION skz_bot_is_secret_key(p_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_key IN (
    'discord_token',
    'discord_client_id',
    'discord_client_secret',
    'supabase_url',
    'supabase_service_role_key'
  );
$$;

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
    -- Do not overwrite secrets when the UI sends placeholder or an empty field.
    IF skz_bot_is_secret_key(trim(v_key))
      AND (v_value = '__SECRET_SET__' OR NULLIF(trim(v_value), '') IS NULL)
    THEN
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
