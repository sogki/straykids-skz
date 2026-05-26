-- Seed SKZ Arcade defaults — update values in Supabase dashboard for your sogki project

INSERT INTO skz_settings (key, value, is_public, description) VALUES
  ('supabase_url', 'https://YOUR_PROJECT_REF.supabase.co', true, 'Public Supabase project URL'),
  ('supabase_anon_key', 'YOUR_SUPABASE_ANON_KEY', true, 'Publishable anon key (safe in browser)'),
  ('hero_image_url', 'hero/banner.jpg', true, 'Landing hero — full URL or path in skz_arcade bucket (e.g. hero/banner.jpg)'),
  ('site_title', 'SKZ Arcade', true, 'Site title'),
  ('site_tagline', 'Daily puzzles and minigames for STAYs', true, 'Short tagline'),
  ('supabase_service_role_key', 'YOUR_SERVICE_ROLE_KEY', false, 'SERVER ONLY — never expose to browser'),
  ('max_daily_guesses', '5', true, 'Daily song guess limit')
ON CONFLICT (key) DO NOTHING;

INSERT INTO skz_games (slug, title, description, emoji, path, color, tag, sort_order) VALUES
  ('guess-song', 'Daily Song Guess', '5 tries. Hints unlock each miss. New puzzle every day.', '🎵', '/guess-song', '#a855f7', 'Daily', 1),
  ('fan-profile', 'Fan Profile Maker', 'Design your STAY profile card.', '✨', '/fan-profile', '#ef4444', 'Creative', 2),
  ('bias-quiz', 'Bias Quiz', 'Which member matches your vibe?', '🎯', '/bias-quiz', '#c0c0c0', 'Quiz', 3)
ON CONFLICT (slug) DO NOTHING;

-- Sample daily songs (add more via dashboard or future seed scripts)
INSERT INTO skz_daily_songs (slug, answers, reveals) VALUES
  ('hellevator', '["hellevator","hellavator"]', '[
    {"type":"emoji","label":"Clue","content":"🔥🚪"},
    {"type":"category","label":"Type","content":"Pre-debut release"},
    {"type":"hint","label":"Hint","content":"Something hot behind a door"},
    {"type":"letters","label":"Letters","content":""},
    {"type":"year","label":"Year","content":"2017"}
  ]'),
  ('gods-menu', '["god''s menu","gods menu"]', '[
    {"type":"emoji","label":"Clue","content":"🎭👑🍳"},
    {"type":"category","label":"Type","content":"Title track"},
    {"type":"hint","label":"Hint","content":"A royal recipe for chaos"},
    {"type":"letters","label":"Letters","content":""},
    {"type":"era","label":"Era","content":"GO LIVE era energy"}
  ]'),
  ('maniac', '["maniac"]', '[
    {"type":"emoji","label":"Clue","content":"💎🔒🌀"},
    {"type":"category","label":"Type","content":"Comeback anthem"},
    {"type":"hint","label":"Hint","content":"Precious, locked, and unhinged"},
    {"type":"letters","label":"Letters","content":""},
    {"type":"year","label":"Year","content":"2022"}
  ]'),
  ('thunderous', '["thunderous"]', '[
    {"type":"emoji","label":"Clue","content":"⚡🏃‍♂️💨"},
    {"type":"category","label":"Type","content":"High-energy title"},
    {"type":"hint","label":"Hint","content":"Loud steps, faster pace"},
    {"type":"letters","label":"Letters","content":""},
    {"type":"era","label":"Era","content":"NOEASY"}
  ]'),
  ('back-door', '["back door","backdoor"]', '[
    {"type":"emoji","label":"Clue","content":"🚪🔙🎺"},
    {"type":"category","label":"Type","content":"Fan-favourite bop"},
    {"type":"hint","label":"Hint","content":"Enter from behind, leave iconic"},
    {"type":"letters","label":"Letters","content":""},
    {"type":"year","label":"Year","content":"2020"}
  ]')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO skz_quiz_members (slug, name, emoji, color, description, sort_order) VALUES
  ('bangchan', 'Bang Chan', '🐺', '#7c3aed', 'Leader energy — creative, reliable, always looking out for the crew.', 1),
  ('leeknow', 'Lee Know', '🐰', '#94a3b8', 'Cool outside, soft inside — impeccable taste and dry humour.', 2),
  ('changbin', 'Changbin', '🐷', '#ef4444', 'Intense passion and unstoppable drive — the hype friend.', 3),
  ('hyunjin', 'Hyunjin', '🦙', '#f472b6', 'Artistic soul with main-character energy.', 4),
  ('han', 'Han', '🐿️', '#f59e0b', 'Talent and emotion — channels everything into art.', 5),
  ('felix', 'Felix', '🐱', '#fbbf24', 'Sunshine personified — contagious laugh, thoughtful heart.', 6),
  ('seungmin', 'Seungmin', '🐶', '#38bdf8', 'Steady, sweet, secretly competitive — loyalty unmatched.', 7),
  ('in', 'I.N', '🦊', '#fb923c', 'Maknae charm with old-soul wisdom.', 8)
ON CONFLICT (slug) DO NOTHING;
