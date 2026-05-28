-- QOTD scheduler testing: reset daily lock + run real schedule check from admin.

ALTER TABLE skz_bot_outbox
  DROP CONSTRAINT IF EXISTS skz_bot_outbox_action_check;

ALTER TABLE skz_bot_outbox
  ADD CONSTRAINT skz_bot_outbox_action_check
  CHECK (action IN (
    'DEPLOY_MESSAGE',
    'SYNC_GUILD_CACHE',
    'RUN_DAILY_QUESTION_NOW',
    'RESET_QOTD_SCHEDULER_LOCK',
    'RUN_DAILY_QUESTION_SCHEDULER_TEST'
  ));

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

  IF p_action NOT IN (
    'DEPLOY_MESSAGE',
    'SYNC_GUILD_CACHE',
    'RUN_DAILY_QUESTION_NOW',
    'RESET_QOTD_SCHEDULER_LOCK',
    'RUN_DAILY_QUESTION_SCHEDULER_TEST'
  ) THEN
    RAISE EXCEPTION 'invalid action';
  END IF;

  INSERT INTO skz_bot_outbox (action, payload)
  VALUES (p_action, COALESCE(p_payload, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_bot_queue_action(text, text, jsonb) TO anon, authenticated;
