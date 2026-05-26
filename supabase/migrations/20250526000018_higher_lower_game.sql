-- Register Higher or Lower in arcade list

INSERT INTO skz_games (slug, title, description, emoji, path, color, tag, sort_order, is_active)
VALUES (
  'higher-lower',
  'Higher or Lower',
  'Compare SKZ stats and stack a streak — fast-paced unlimited rounds.',
  '📈',
  '/higher-lower',
  '#a855f7',
  'Minigame',
  8,
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
