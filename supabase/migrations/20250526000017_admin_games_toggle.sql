-- Admin RPCs for listing and toggling games on/off.
-- Public skz_games queries already filter on is_active, so a single boolean
-- flip here will hide the game in nav, arcade, and (via route guard) the URL.

CREATE OR REPLACE FUNCTION skz_admin_list_games(p_code text)
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

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.sort_order, r.title)
    FROM (
      SELECT
        id,
        slug,
        title,
        description,
        emoji,
        path,
        color,
        tag,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM skz_games
    ) r
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_list_games(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION skz_admin_set_game_active(
  p_code text,
  p_slug text,
  p_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  v_slug := NULLIF(trim(p_slug), '');
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'slug required';
  END IF;

  UPDATE skz_games
  SET is_active = COALESCE(p_active, true),
      updated_at = now()
  WHERE slug = v_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game not found: %', v_slug;
  END IF;

  RETURN skz_admin_list_games(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION skz_admin_set_game_active(text, text, boolean) TO anon, authenticated;
