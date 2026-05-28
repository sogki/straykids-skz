-- SKZ Discord bot schema.
--
-- Three tables live here:
--   skz_bot_settings           key/value config (guild id, verify ids,
--                              join-to-create channel/category, etc.)
--   skz_bot_reaction_roles     one row per emoji→role assignment. Also
--                              covers the "verify on react" feature via
--                              category='verify' — same mechanics, just
--                              labelled for the admin UI.
--   skz_bot_temp_voice_channels  the personal VCs the bot creates from
--                                the "join to create" hub. Tracked so we
--                                can clean them up on bot restart.
--
-- The bot reads everything with the service role key (bypasses RLS).
-- Admin UI uses skz_admin_bot_* RPCs (next migration) which gate on the
-- existing staff code. No anon/authenticated direct table access.

-- ─────────────────────────────────────────────
-- skz_bot_settings
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skz_bot_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL UNIQUE,
  value         text NOT NULL DEFAULT '',
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skz_bot_settings_key_idx ON skz_bot_settings (key);

DROP TRIGGER IF EXISTS skz_bot_settings_updated_at ON skz_bot_settings;
CREATE TRIGGER skz_bot_settings_updated_at
  BEFORE UPDATE ON skz_bot_settings
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();

-- Seed the keys we recognise so the admin UI has known slots to render.
-- Values default to '' (empty) — admin fills them in.
INSERT INTO skz_bot_settings (key, description) VALUES
  ('guild_id',                   'Discord server ID where the bot operates'),
  ('verify_channel_id',          'Channel containing the verify message'),
  ('verify_message_id',          'Specific message users react to in order to verify'),
  ('verify_emoji',               'Emoji used for the verify reaction (e.g. ✅ or a custom <:name:id>)'),
  ('verify_role_id',             'Role granted when a user reacts with the verify emoji'),
  ('join_to_create_channel_id',  'Hub VC — joining it triggers personal-VC creation'),
  ('join_to_create_category_id', 'Category under which personal VCs are created (optional, defaults to hub VC parent)'),
  ('join_to_create_name_pattern','Name pattern for personal VCs. {username} and {displayname} are substituted')
ON CONFLICT (key) DO NOTHING;

-- Reasonable default for the naming pattern.
UPDATE skz_bot_settings
  SET value = '{username}''s vc'
  WHERE key = 'join_to_create_name_pattern' AND value = '';


-- ─────────────────────────────────────────────
-- skz_bot_reaction_roles
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skz_bot_reaction_roles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- which message the user reacts on
  channel_id    text NOT NULL,
  message_id    text NOT NULL,
  -- the emoji and role
  emoji         text NOT NULL,
  role_id       text NOT NULL,
  -- admin metadata
  category      text NOT NULL DEFAULT 'general'
                  CHECK (category IN ('verify', 'pronouns', 'colors', 'general', 'other')),
  label         text NOT NULL DEFAULT '',
  -- whether removing the reaction also removes the role.
  -- verify roles are typically sticky; pronoun/color roles toggle.
  remove_on_unreact boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- A given emoji can only be bound to a single role per message.
CREATE UNIQUE INDEX IF NOT EXISTS skz_bot_rr_message_emoji_idx
  ON skz_bot_reaction_roles (message_id, emoji);

CREATE INDEX IF NOT EXISTS skz_bot_rr_active_idx
  ON skz_bot_reaction_roles (is_active);

DROP TRIGGER IF EXISTS skz_bot_rr_updated_at ON skz_bot_reaction_roles;
CREATE TRIGGER skz_bot_rr_updated_at
  BEFORE UPDATE ON skz_bot_reaction_roles
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();


-- ─────────────────────────────────────────────
-- skz_bot_temp_voice_channels
-- Tracks personal VCs spawned from the join-to-create hub so the bot can
-- clean them up when empty (and on startup, in case it died with channels
-- left over).
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skz_bot_temp_voice_channels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id        text NOT NULL,
  channel_id      text NOT NULL UNIQUE,
  owner_user_id   text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skz_bot_tvc_guild_idx
  ON skz_bot_temp_voice_channels (guild_id);


-- ─────────────────────────────────────────────
-- RLS — service-role only. The admin UI talks via SECURITY DEFINER RPCs.
-- ─────────────────────────────────────────────
ALTER TABLE skz_bot_settings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_bot_reaction_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_bot_temp_voice_channels   ENABLE ROW LEVEL SECURITY;

CREATE POLICY skz_bot_settings_service_all ON skz_bot_settings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY skz_bot_rr_service_all ON skz_bot_reaction_roles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY skz_bot_tvc_service_all ON skz_bot_temp_voice_channels
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
