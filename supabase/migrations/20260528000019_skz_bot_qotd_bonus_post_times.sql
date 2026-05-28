-- Separate UTC post times for bonus QOTD types (independent of main QOTD time).

INSERT INTO skz_bot_settings (key, value, description)
VALUES
  (
    'qotd_bonus_would_you_rather_post_hour_utc',
    '18',
    'UTC hour (0-23) for Would You Rather bonus post'
  ),
  (
    'qotd_bonus_would_you_rather_post_minute_utc',
    '0',
    'UTC minute (0-59) for Would You Rather bonus post'
  ),
  (
    'qotd_bonus_throwback_thursday_post_hour_utc',
    '18',
    'UTC hour (0-23) for Throwback Thursday bonus post'
  ),
  (
    'qotd_bonus_throwback_thursday_post_minute_utc',
    '30',
    'UTC minute (0-59) for Throwback Thursday bonus post'
  )
ON CONFLICT (key) DO NOTHING;
