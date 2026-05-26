-- Register SKZOO Match in arcade list

INSERT INTO skz_games (slug, title, description, emoji, path, color, tag, sort_order, is_active)
VALUES (
  'memory-match',
  'SKZOO Match',
  'Match SKZOO buddy pairs — random board every round, unlimited plays.',
  '🦊',
  '/memory-match',
  '#22c55e',
  'Minigame',
  6,
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
