-- Welcome & goodbye embed messages (separate channels from moderation logs).

INSERT INTO skz_bot_settings (key, value, description)
VALUES
  ('welcome_enabled', 'false', 'Post a welcome embed when a member joins'),
  ('welcome_channel_id', '', 'Channel for welcome messages'),
  ('goodbye_enabled', 'false', 'Post a goodbye embed when a member leaves'),
  ('goodbye_channel_id', '', 'Channel for goodbye messages'),
  (
    'welcome_embed',
    '{
      "title": "Welcome to {server}!",
      "description": "Hey {mention} — glad you made it to Stay Café.",
      "color": 5763719,
      "url": "",
      "author": { "name": "", "url": "", "icon_url": "" },
      "thumbnail": { "url": "{avatar_url}" },
      "image": { "url": "" },
      "footer": { "text": "", "icon_url": "" },
      "fields": [
        { "name": "Member", "value": "{tag}", "inline": true },
        { "name": "Member #", "value": "{member_count}", "inline": true },
        { "name": "Account created", "value": "{account_created}", "inline": false }
      ]
    }',
    'JSON embed template for welcome messages'
  ),
  (
    'goodbye_embed',
    '{
      "title": "Goodbye",
      "description": "{mention} left the server.",
      "color": 15548997,
      "url": "",
      "author": { "name": "", "url": "", "icon_url": "" },
      "thumbnail": { "url": "{avatar_url}" },
      "image": { "url": "" },
      "footer": { "text": "", "icon_url": "" },
      "fields": [
        { "name": "Member", "value": "{tag}", "inline": true },
        { "name": "Left", "value": "{left_at}", "inline": true },
        { "name": "Joined", "value": "{joined_at}", "inline": false }
      ]
    }',
    'JSON embed template for goodbye messages'
  )
ON CONFLICT (key) DO NOTHING;
