-- Server security: account age gate, prohibited content auto-ban, moderation audit.

INSERT INTO skz_bot_settings (key, description) VALUES
  ('account_age_gate_enabled',           'Reject members whose Discord account is younger than the minimum age'),
  ('account_age_min_hours',              'Minimum Discord account age in hours (default 24)'),
  ('account_age_action',                 'Action for young accounts: kick or ban'),
  ('account_age_log_channel_id',         'Discord channel for account age rejections'),
  ('content_filter_enabled',             'Auto-delete and ban messages matching prohibited content patterns'),
  ('content_filter_action',              'Action after prohibited content: ban or kick'),
  ('content_filter_log_channel_id',      'Discord channel for content filter actions'),
  ('content_filter_exempt_channel_ids',  'Comma-separated channel IDs where content filter is disabled (e.g. staff mod channels)'),
  ('content_filter_patterns',            'JSON array of {id, label, pattern} regex rules')
ON CONFLICT (key) DO NOTHING;

UPDATE skz_bot_settings SET value = 'false' WHERE key = 'account_age_gate_enabled' AND value = '';
UPDATE skz_bot_settings SET value = '24'    WHERE key = 'account_age_min_hours' AND value = '';
UPDATE skz_bot_settings SET value = 'kick'  WHERE key = 'account_age_action' AND value = '';
UPDATE skz_bot_settings SET value = 'false' WHERE key = 'content_filter_enabled' AND value = '';
UPDATE skz_bot_settings SET value = 'ban'   WHERE key = 'content_filter_action' AND value = '';

-- Extend mod log event types for security actions.
ALTER TABLE skz_bot_mod_log_events
  DROP CONSTRAINT IF EXISTS skz_bot_mod_log_events_event_type_check;

ALTER TABLE skz_bot_mod_log_events
  ADD CONSTRAINT skz_bot_mod_log_events_event_type_check
  CHECK (event_type IN (
    'member_join',
    'member_info',
    'message_delete',
    'message_edit',
    'message_bulk_delete',
    'account_age_rejected',
    'content_filter_action'
  ));

-- Audit trail for automated moderation.
CREATE TABLE IF NOT EXISTS skz_bot_moderation_actions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id              text NOT NULL,
  target_discord_user_id text NOT NULL,
  action_type           text NOT NULL CHECK (action_type IN ('kick', 'ban', 'message_delete')),
  reason                text NOT NULL,
  matched_rule_id       text,
  matched_rule_label    text,
  channel_id            text,
  message_id            text,
  actor_type            text NOT NULL DEFAULT 'auto' CHECK (actor_type IN ('auto', 'staff')),
  payload               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skz_bot_moderation_actions_guild_created_idx
  ON skz_bot_moderation_actions (guild_id, created_at DESC);

ALTER TABLE skz_bot_moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY skz_bot_moderation_actions_service_all ON skz_bot_moderation_actions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
