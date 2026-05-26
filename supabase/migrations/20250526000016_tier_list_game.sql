-- Register SKZ Tier List Lab in arcade list

INSERT INTO skz_games (slug, title, description, emoji, path, color, tag, sort_order, is_active)
VALUES (
  'tier-list',
  'SKZ Tier List Lab',
  'Build customizable tier lists with SKZOO, gallery images, and uploads.',
  '📚',
  '/tier-list',
  '#f59e0b',
  'Creative',
  7,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  emoji = EXCLUDED.emoji,
  path = EXCLUDED.path,
  color = EXCLUDED.color,
  tag = EXCLUDED.tag,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();
