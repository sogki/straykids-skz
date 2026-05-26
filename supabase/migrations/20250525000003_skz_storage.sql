-- Storage bucket setting + public read policy for skz_arcade assets
-- Create the bucket in Supabase Dashboard: Storage → New bucket → skz_arcade (public)

INSERT INTO skz_settings (key, value, is_public, description) VALUES
  ('storage_bucket', 'skz_arcade', true, 'Supabase Storage bucket name for site images'),
  ('creator_name', 'sogki', true, 'Site creator display name'),
  ('creator_url', 'https://sogki.dev', true, 'Creator website URL')
ON CONFLICT (key) DO NOTHING;

-- Example hero_image_url values (pick one style in dashboard):
--   Full URL:  https://example.com/hero.jpg
--   Bucket path:  hero/banner.jpg  → served from public skz_arcade bucket
