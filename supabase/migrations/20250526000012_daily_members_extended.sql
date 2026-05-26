-- Extended daily member questions (question_type + prompt)

ALTER TABLE skz_daily_members
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'trivia',
  ADD COLUMN IF NOT EXISTS prompt text NOT NULL DEFAULT '';
