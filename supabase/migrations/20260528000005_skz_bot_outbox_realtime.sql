-- Instant deploy: bot subscribes to skz_bot_outbox inserts via Supabase Realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'skz_bot_outbox'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE skz_bot_outbox;
  END IF;
END $$;
