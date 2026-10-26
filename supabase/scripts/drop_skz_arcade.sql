-- =============================================================================
-- SKZ Arcade teardown — run manually in Supabase SQL Editor
-- =============================================================================
-- SCOPE: Only objects whose names start with skz_ (plus the skz_arcade storage
-- bucket). Safe on a shared sogki project — other tables are not touched.
--
-- BEFORE YOU RUN:
-- 1. Stop / remove the Railway Discord bot (it uses skz_bot_* tables).
-- 2. Confirm you want to delete Discord bot config, QOTD, mod notes, player
--    sessions, analytics, daily puzzles, etc. This is irreversible.
-- 3. Optional backup: Dashboard → Database → Backups, or pg_dump the skz_* tables.
--
-- AFTER: Delete the skz_arcade storage bucket in Dashboard → Storage if the
-- DELETE below does not fully clear it (UI may still show an empty bucket).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Functions (RPCs) named skz_*
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS func_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'skz_%'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      r.schema_name,
      r.func_name,
      r.args
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Views named skz_*
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, viewname
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname LIKE 'skz_%'
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', r.schemaname, r.viewname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Tables named skz_* (policies/triggers/FKs go with CASCADE)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'skz_%'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Sequences named skz_* (if any remain after table drops)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
      AND sequence_name LIKE 'skz_%'
  LOOP
    EXECUTE format(
      'DROP SEQUENCE IF EXISTS %I.%I CASCADE',
      r.sequence_schema,
      r.sequence_name
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Types named skz_* (enums / composites, if any)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, t.typname AS type_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname LIKE 'skz_%'
      AND t.typtype IN ('e', 'c') -- enum or composite
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS %I.%I CASCADE', r.schema_name, r.type_name);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6) Storage bucket skz_arcade (objects first, then bucket)
-- ---------------------------------------------------------------------------
DELETE FROM storage.objects WHERE bucket_id = 'skz_arcade';
DELETE FROM storage.buckets WHERE id = 'skz_arcade';

COMMIT;

-- Optional verification (run after commit):
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'skz_%';
-- SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND proname LIKE 'skz_%';
