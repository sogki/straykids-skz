-- Rename memory match → SKZOO Match (unlimited minigame copy)

UPDATE skz_games
SET
  title = 'SKZOO Match',
  description = 'Match SKZOO buddy pairs — random board every round, unlimited plays.',
  emoji = '🦊',
  tag = 'Minigame',
  updated_at = now()
WHERE slug = 'memory-match';
