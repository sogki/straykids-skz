-- Admin staff code (single row — change only via SQL / Supabase table editor)
-- Analytics events + admin RPCs (staff code never exposed to clients)

-- ─────────────────────────────────────────────
-- Staff code (not readable by anon)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skz_admin_staff (
  id          smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  staff_code  text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE skz_admin_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY skz_admin_staff_service_all ON skz_admin_staff
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO skz_admin_staff (id, staff_code)
VALUES (1, 'CHANGE_ME_IN_SUPABASE')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- Analytics (insert-only for visitors via RPC)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skz_analytics_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL,
  path        text,
  game_slug   text,
  session_id  text NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skz_analytics_created_idx
  ON skz_analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS skz_analytics_type_created_idx
  ON skz_analytics_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS skz_analytics_game_idx
  ON skz_analytics_events (game_slug, created_at DESC)
  WHERE game_slug IS NOT NULL;

ALTER TABLE skz_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY skz_analytics_service_all ON skz_analytics_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────
-- Site-wide banner (public keys — editable via admin RPC)
-- ─────────────────────────────────────────────
INSERT INTO skz_settings (key, value, is_public, description) VALUES
  ('site_banner_enabled', 'false', true, 'Show announcement bar site-wide'),
  ('site_banner_message', '', true, 'Banner message text'),
  ('site_banner_link', '', true, 'Optional CTA link (full URL or site path)'),
  ('site_banner_variant', 'promo', true, 'Banner style: promo | info | alert')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION skz_admin_code_valid(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM skz_admin_staff
    WHERE id = 1 AND staff_code = p_code
  );
$$;

REVOKE ALL ON FUNCTION skz_admin_code_valid(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION skz_admin_code_valid(text) TO service_role;

-- ─────────────────────────────────────────────
-- Public: track events (anon)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION skz_track_event(
  p_event_type text,
  p_path text DEFAULT NULL,
  p_game_slug text DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session text;
BEGIN
  IF p_event_type IS NULL OR length(trim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'event_type required';
  END IF;

  v_session := COALESCE(NULLIF(trim(p_session_id), ''), 'anonymous');

  INSERT INTO skz_analytics_events (event_type, path, game_slug, session_id, metadata)
  VALUES (
    lower(trim(p_event_type)),
    NULLIF(trim(p_path), ''),
    NULLIF(trim(p_game_slug), ''),
    v_session,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_track_event(text, text, text, text, jsonb) TO anon, authenticated;

-- ─────────────────────────────────────────────
-- Admin: verify staff code (login)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION skz_admin_verify_staff_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN false;
  END IF;
  RETURN skz_admin_code_valid(trim(p_code));
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_verify_staff_code(text) TO anon, authenticated;

-- ─────────────────────────────────────────────
-- Admin: analytics summary (accurate from skz_analytics_events)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION skz_admin_get_analytics(
  p_code text,
  p_days int DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days int;
  v_since timestamptz;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  v_days := GREATEST(1, LEAST(COALESCE(p_days, 7), 90));
  v_since := now() - (v_days || ' days')::interval;

  RETURN jsonb_build_object(
    'days', v_days,
    'since', v_since,
    'totals', (
      SELECT jsonb_build_object(
        'page_views', COUNT(*) FILTER (WHERE event_type = 'page_view'),
        'game_starts', COUNT(*) FILTER (WHERE event_type = 'game_start'),
        'game_completes', COUNT(*) FILTER (WHERE event_type = 'game_complete'),
        'all_events', COUNT(*)
      )
      FROM skz_analytics_events
      WHERE created_at >= v_since
    ),
    'unique_sessions', (
      SELECT COUNT(DISTINCT session_id)
      FROM skz_analytics_events
      WHERE created_at >= v_since
    ),
    'by_day', COALESCE((
      SELECT jsonb_agg(row_to_json(d)::jsonb ORDER BY d.day)
      FROM (
        SELECT
          to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
          COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
          COUNT(*) FILTER (WHERE event_type = 'game_start') AS game_starts,
          COUNT(DISTINCT session_id) AS sessions
        FROM skz_analytics_events
        WHERE created_at >= v_since
        GROUP BY 1
      ) d
    ), '[]'::jsonb),
    'by_game', COALESCE((
      SELECT jsonb_agg(row_to_json(g)::jsonb ORDER BY g.starts DESC)
      FROM (
        SELECT
          game_slug,
          COUNT(*) FILTER (WHERE event_type = 'game_start') AS starts,
          COUNT(*) FILTER (WHERE event_type = 'game_complete') AS completes
        FROM skz_analytics_events
        WHERE created_at >= v_since AND game_slug IS NOT NULL
        GROUP BY game_slug
      ) g
    ), '[]'::jsonb),
    'recent', COALESCE((
      SELECT jsonb_agg(row_to_json(r)::jsonb)
      FROM (
        SELECT event_type, path, game_slug, session_id, created_at
        FROM skz_analytics_events
        WHERE created_at >= v_since
        ORDER BY created_at DESC
        LIMIT 40
      ) r
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_get_analytics(text, int) TO anon, authenticated;

-- ─────────────────────────────────────────────
-- Admin: read / update site banner
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION skz_admin_get_banner(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_object_agg(key, value)
      FROM skz_settings
      WHERE key IN (
        'site_banner_enabled',
        'site_banner_message',
        'site_banner_link',
        'site_banner_variant'
      )
    ),
    '{}'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_get_banner(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_update_banner(
  p_code text,
  p_enabled boolean,
  p_message text,
  p_link text DEFAULT '',
  p_variant text DEFAULT 'promo'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant text;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  v_variant := lower(COALESCE(NULLIF(trim(p_variant), ''), 'promo'));
  IF v_variant NOT IN ('promo', 'info', 'alert') THEN
    v_variant := 'promo';
  END IF;

  INSERT INTO skz_settings (key, value, is_public, description)
  VALUES
    ('site_banner_enabled', CASE WHEN p_enabled THEN 'true' ELSE 'false' END, true, 'Show announcement bar site-wide'),
    ('site_banner_message', COALESCE(p_message, ''), true, 'Banner message text'),
    ('site_banner_link', COALESCE(p_link, ''), true, 'Optional CTA link'),
    ('site_banner_variant', v_variant, true, 'Banner style')
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();

  RETURN skz_admin_get_banner(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_update_banner(text, boolean, text, text, text) TO anon, authenticated;
