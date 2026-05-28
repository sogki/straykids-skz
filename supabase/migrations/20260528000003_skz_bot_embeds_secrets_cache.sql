-- Bot secrets in skz_bot_settings, Discord entity cache, embed messages,
-- and a deploy outbox the bot drains to post/update Discord embeds.

-- ── Secret + credential keys (stored in DB, masked in admin reads) ──
INSERT INTO skz_bot_settings (key, description) VALUES
  ('discord_token',              'Discord bot token — server-side only'),
  ('discord_client_id',          'Discord application client ID'),
  ('supabase_url',               'Supabase project URL'),
  ('supabase_service_role_key',  'Supabase service role key — server-side only')
ON CONFLICT (key) DO NOTHING;

-- ── Discord guild entity cache (channels, roles) synced by the bot ──
CREATE TABLE IF NOT EXISTS skz_bot_discord_cache (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id      text NOT NULL,
  entity_type   text NOT NULL CHECK (entity_type IN ('channel', 'role')),
  entity_id     text NOT NULL,
  name          text NOT NULL DEFAULT '',
  parent_id     text,
  channel_type  int,
  position      int NOT NULL DEFAULT 0,
  extra         jsonb NOT NULL DEFAULT '{}',
  synced_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guild_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS skz_bot_discord_cache_guild_type_idx
  ON skz_bot_discord_cache (guild_id, entity_type, position);

-- ── Bot messages (embed panels for verify, reaction roles, etc.) ──
CREATE TABLE IF NOT EXISTS skz_bot_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text NOT NULL UNIQUE,
  label               text NOT NULL DEFAULT '',
  kind                text NOT NULL DEFAULT 'reaction_roles'
                        CHECK (kind IN ('verify', 'reaction_roles', 'general')),
  channel_id          text NOT NULL DEFAULT '',
  discord_message_id  text,
  embed               jsonb NOT NULL DEFAULT '{}',
  interaction_mode    text NOT NULL DEFAULT 'reaction'
                        CHECK (interaction_mode IN ('reaction', 'button', 'both')),
  is_active           boolean NOT NULL DEFAULT true,
  sort_order          int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS skz_bot_messages_updated_at ON skz_bot_messages;
CREATE TRIGGER skz_bot_messages_updated_at
  BEFORE UPDATE ON skz_bot_messages
  FOR EACH ROW EXECUTE FUNCTION skz_set_updated_at();

-- Link reaction roles to a bot message panel (optional; legacy channel/message
-- columns remain for backwards compat until migrated).
ALTER TABLE skz_bot_reaction_roles
  ADD COLUMN IF NOT EXISTS bot_message_id uuid REFERENCES skz_bot_messages (id) ON DELETE SET NULL;

ALTER TABLE skz_bot_reaction_roles
  ADD COLUMN IF NOT EXISTS button_style text DEFAULT NULL
    CHECK (button_style IS NULL OR button_style IN ('primary', 'secondary', 'success', 'danger'));

ALTER TABLE skz_bot_reaction_roles
  ADD COLUMN IF NOT EXISTS button_emoji text DEFAULT '';

-- ── Outbox: admin queues deploy actions; bot drains on /reload + poll ──
CREATE TABLE IF NOT EXISTS skz_bot_outbox (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action        text NOT NULL CHECK (action IN ('DEPLOY_MESSAGE', 'SYNC_GUILD_CACHE')),
  payload       jsonb NOT NULL DEFAULT '{}',
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS skz_bot_outbox_pending_idx
  ON skz_bot_outbox (status, created_at)
  WHERE status = 'pending';

ALTER TABLE skz_bot_discord_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_bot_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE skz_bot_outbox        ENABLE ROW LEVEL SECURITY;

CREATE POLICY skz_bot_discord_cache_service ON skz_bot_discord_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY skz_bot_messages_service ON skz_bot_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY skz_bot_outbox_service ON skz_bot_outbox
  FOR ALL TO service_role USING (true) WITH CHECK (true);
