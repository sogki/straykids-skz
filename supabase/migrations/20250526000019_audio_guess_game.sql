-- Register Audio Guess in arcade list

INSERT INTO skz_games (slug, title, description, emoji, path, color, tag, sort_order, is_active)
VALUES (
  'audio-guess',
  'Audio Guess',
  'Name the track from a short clip. Wrong guesses unlock more audio.',
  '🎧',
  '/audio-guess',
  '#fb7185',
  'Daily',
  9,
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
