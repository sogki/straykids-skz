-- Public contact / legal requests + admin inbox

CREATE TABLE IF NOT EXISTS skz_site_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type  text NOT NULL CHECK (
    request_type IN (
      'data_correction',
      'takedown',
      'privacy',
      'general',
      'other'
    )
  ),
  name          text NOT NULL,
  email         text NOT NULL,
  subject       text NOT NULL DEFAULT '',
  message       text NOT NULL,
  page_url      text,
  status        text NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'in_progress', 'resolved', 'dismissed')
  ),
  admin_notes   text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skz_site_requests_status_created_idx
  ON skz_site_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS skz_site_requests_email_created_idx
  ON skz_site_requests (lower(email), created_at DESC);

ALTER TABLE skz_site_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY skz_site_requests_service_all ON skz_site_requests
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS skz_site_requests_updated_at ON skz_site_requests;
CREATE TRIGGER skz_site_requests_updated_at
  BEFORE UPDATE ON skz_site_requests
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();

-- ── Public submit (rate-limited by email) ──
CREATE OR REPLACE FUNCTION skz_submit_site_request(
  p_request_type text,
  p_name text,
  p_email text,
  p_subject text,
  p_message text,
  p_page_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_type text := lower(trim(coalesce(p_request_type, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_subject text := trim(coalesce(p_subject, ''));
  v_message text := trim(coalesce(p_message, ''));
  v_recent int;
BEGIN
  IF v_type NOT IN ('data_correction', 'takedown', 'privacy', 'general', 'other') THEN
    RAISE EXCEPTION 'invalid_request_type';
  END IF;

  IF length(v_name) < 2 OR length(v_name) > 120 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;

  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 254 THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  IF length(v_message) < 10 OR length(v_message) > 8000 THEN
    RAISE EXCEPTION 'invalid_message';
  END IF;

  IF length(v_subject) > 200 THEN
    RAISE EXCEPTION 'invalid_subject';
  END IF;

  SELECT count(*)::int INTO v_recent
  FROM skz_site_requests
  WHERE lower(email) = v_email
    AND created_at > now() - interval '1 hour';

  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  INSERT INTO skz_site_requests (
    request_type,
    name,
    email,
    subject,
    message,
    page_url
  )
  VALUES (
    v_type,
    v_name,
    v_email,
    v_subject,
    v_message,
    nullif(trim(coalesce(p_page_url, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION skz_submit_site_request(text, text, text, text, text, text)
  TO anon, authenticated;

-- ── Admin: list requests ──
CREATE OR REPLACE FUNCTION skz_admin_list_site_requests(
  p_code text,
  p_status text DEFAULT NULL,
  p_limit int DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := least(greatest(coalesce(p_limit, 100), 1), 200);
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN coalesce(
    (
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC)
      FROM (
        SELECT
          id,
          request_type,
          name,
          email,
          subject,
          message,
          page_url,
          status,
          admin_notes,
          created_at,
          updated_at
        FROM skz_site_requests
        WHERE p_status IS NULL
          OR trim(p_status) = ''
          OR status = trim(p_status)
        ORDER BY created_at DESC
        LIMIT v_limit
      ) t
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_list_site_requests(text, text, int)
  TO anon, authenticated;

-- ── Admin: update request ──
CREATE OR REPLACE FUNCTION skz_admin_update_site_request(
  p_code text,
  p_request_id uuid,
  p_status text,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text := trim(coalesce(p_status, ''));
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF v_status NOT IN ('new', 'in_progress', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  UPDATE skz_site_requests
  SET
    status = v_status,
    admin_notes = coalesce(trim(p_admin_notes), admin_notes)
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  RETURN (
    SELECT row_to_json(r)::jsonb
    FROM skz_site_requests r
    WHERE r.id = p_request_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_update_site_request(text, uuid, text, text)
  TO anon, authenticated;
