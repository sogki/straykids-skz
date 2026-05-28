-- Bonus QOTD types post on configured UTC weekdays; standard posts every day.
-- One scheduler lock row per (run_date, question_type).

ALTER TABLE skz_bot_daily_question_runs
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'standard';

ALTER TABLE skz_bot_daily_question_runs
  DROP CONSTRAINT IF EXISTS skz_bot_daily_question_runs_question_type_check;

ALTER TABLE skz_bot_daily_question_runs
  ADD CONSTRAINT skz_bot_daily_question_runs_question_type_check
  CHECK (question_type IN ('standard', 'would_you_rather', 'throwback_thursday'));

ALTER TABLE skz_bot_daily_question_runs
  DROP CONSTRAINT IF EXISTS skz_bot_daily_question_runs_pkey;

ALTER TABLE skz_bot_daily_question_runs
  ADD PRIMARY KEY (run_date, question_type);

INSERT INTO skz_bot_settings (key, value, description)
VALUES
  (
    'qotd_bonus_would_you_rather_post_day_utc',
    '2',
    'UTC weekday (0=Sun … 6=Sat) for Would You Rather bonus post'
  ),
  (
    'qotd_bonus_throwback_thursday_post_day_utc',
    '4',
    'UTC weekday (0=Sun … 6=Sat) for Throwback Thursday bonus post'
  )
ON CONFLICT (key) DO NOTHING;
