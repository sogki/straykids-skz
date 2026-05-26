-- Extended site banner settings (icons, custom colours, link label)

INSERT INTO skz_settings (key, value, is_public, description) VALUES
  ('site_banner_icon', '', true, 'Lucide icon name (PascalCase), empty = none'),
  ('site_banner_bg_color', '#5b21b6', true, 'Custom banner background (hex)'),
  ('site_banner_text_color', '#f5f3ff', true, 'Custom banner text colour (hex)'),
  ('site_banner_use_custom_colors', 'false', true, 'Use custom colours instead of preset variant'),
  ('site_banner_link_label', '', true, 'Optional link hint after message, e.g. Play now →')
ON CONFLICT (key) DO NOTHING;

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
        'site_banner_variant',
        'site_banner_icon',
        'site_banner_bg_color',
        'site_banner_text_color',
        'site_banner_use_custom_colors',
        'site_banner_link_label'
      )
    ),
    '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION skz_admin_update_banner(
  p_code text,
  p_enabled boolean,
  p_message text,
  p_link text DEFAULT '',
  p_variant text DEFAULT 'promo',
  p_icon text DEFAULT '',
  p_bg_color text DEFAULT '',
  p_text_color text DEFAULT '',
  p_use_custom_colors boolean DEFAULT false,
  p_link_label text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant text;
  v_bg text;
  v_fg text;
BEGIN
  IF NOT skz_admin_code_valid(trim(p_code)) THEN
    RAISE EXCEPTION 'invalid staff code' USING ERRCODE = '42501';
  END IF;

  v_variant := lower(COALESCE(NULLIF(trim(p_variant), ''), 'promo'));
  IF v_variant NOT IN ('promo', 'info', 'alert') THEN
    v_variant := 'promo';
  END IF;

  v_bg := NULLIF(trim(p_bg_color), '');
  v_fg := NULLIF(trim(p_text_color), '');
  IF v_bg IS NOT NULL AND v_bg !~ '^#[0-9A-Fa-f]{6}$' THEN
    v_bg := '#5b21b6';
  END IF;
  IF v_fg IS NOT NULL AND v_fg !~ '^#[0-9A-Fa-f]{6}$' THEN
    v_fg := '#f5f3ff';
  END IF;

  INSERT INTO skz_settings (key, value, is_public, description)
  VALUES
    ('site_banner_enabled', CASE WHEN p_enabled THEN 'true' ELSE 'false' END, true, 'Show announcement bar'),
    ('site_banner_message', COALESCE(p_message, ''), true, 'Banner message (markdown subset)'),
    ('site_banner_link', COALESCE(p_link, ''), true, 'Optional link URL or path'),
    ('site_banner_variant', v_variant, true, 'Preset: promo | info | alert'),
    ('site_banner_icon', COALESCE(NULLIF(trim(p_icon), ''), ''), true, 'Lucide icon name'),
    ('site_banner_bg_color', COALESCE(v_bg, '#5b21b6'), true, 'Custom background'),
    ('site_banner_text_color', COALESCE(v_fg, '#f5f3ff'), true, 'Custom text colour'),
    ('site_banner_use_custom_colors', CASE WHEN p_use_custom_colors THEN 'true' ELSE 'false' END, true, 'Custom colours on'),
    ('site_banner_link_label', COALESCE(p_link_label, ''), true, 'Link call-to-action label')
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();

  RETURN skz_admin_get_banner(p_code);
END;
$$;
