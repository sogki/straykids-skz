-- QOTD: optional Discord role to ping when posting (e.g. @QOTD).

INSERT INTO skz_bot_settings (key, value, description)
VALUES (
  'qotd_ping_role_id',
  '',
  'Discord role ID to mention when posting QOTD (and bonus types). Leave empty for no ping.'
)
ON CONFLICT (key) DO NOTHING;
