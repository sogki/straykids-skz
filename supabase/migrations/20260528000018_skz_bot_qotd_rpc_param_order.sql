-- Re-create daily question RPCs (required params first, then optional with defaults).

DROP FUNCTION IF EXISTS skz_admin_bot_create_daily_question(text, text, boolean);
DROP FUNCTION IF EXISTS skz_admin_bot_create_daily_question(text, text, boolean, text);
DROP FUNCTION IF EXISTS skz_admin_bot_create_daily_question(text, boolean, text, text);
DROP FUNCTION IF EXISTS skz_admin_bot_update_daily_question(text, uuid, text, boolean, int);
DROP FUNCTION IF EXISTS skz_admin_bot_update_daily_question(text, uuid, text, boolean, int, text);
DROP FUNCTION IF EXISTS skz_admin_bot_update_daily_question(text, uuid, boolean, text, text, int);

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
