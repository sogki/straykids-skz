-- Customizable JSON embed templates for moderation log Discord posts.

INSERT INTO skz_bot_settings (key, description) VALUES
  ('mod_log_embed_member', 'JSON embed template for member join and /info logs'),
  ('mod_log_embed_message_delete', 'JSON embed template for single message deletes'),
  ('mod_log_embed_message_edit', 'JSON embed template for message edits'),
  ('mod_log_embed_message_bulk_delete', 'JSON embed template for bulk message deletes')
ON CONFLICT (key) DO NOTHING;

-- Defaults mirror the original hard-coded embeds (with placeholders for live data).
UPDATE skz_bot_settings SET value = '{
  "title": "{event_title}",
  "description": "",
  "color": 5793266,
  "url": "",
  "author": { "name": "", "url": "", "icon_url": "" },
  "thumbnail": { "url": "{avatar_url}" },
  "image": { "url": "" },
  "footer": { "text": "Requested by {requested_by}", "icon_url": "" },
  "fields": [
    { "name": "User", "value": "{tag}\n{mention}", "inline": true },
    { "name": "Display name", "value": "{displayname}", "inline": true },
    { "name": "User ID", "value": "`{user_id}`", "inline": true },
    { "name": "Account created", "value": "{account_created}", "inline": false },
    { "name": "Joined server", "value": "{joined_at}", "inline": false },
    { "name": "Bot account", "value": "{is_bot}", "inline": true },
    { "name": "Roles", "value": "{roles}", "inline": false }
  ]
}'::text
WHERE key = 'mod_log_embed_member' AND COALESCE(trim(value), '') = '';

UPDATE skz_bot_settings SET value = '{
  "title": "{event_title}",
  "description": "",
  "color": 15548997,
  "url": "",
  "author": { "name": "", "url": "", "icon_url": "" },
  "thumbnail": { "url": "" },
  "image": { "url": "" },
  "footer": { "text": "", "icon_url": "" },
  "fields": [
    { "name": "Author", "value": "{author_tag} ({author_mention})", "inline": true },
    { "name": "Channel", "value": "{channel}", "inline": true },
    { "name": "Message ID", "value": "`{message_id}`", "inline": true },
    { "name": "Content", "value": "{content}", "inline": false }
  ]
}'::text
WHERE key = 'mod_log_embed_message_delete' AND COALESCE(trim(value), '') = '';

UPDATE skz_bot_settings SET value = '{
  "title": "{event_title}",
  "description": "",
  "color": 16705372,
  "url": "{url}",
  "author": { "name": "", "url": "", "icon_url": "" },
  "thumbnail": { "url": "" },
  "image": { "url": "" },
  "footer": { "text": "", "icon_url": "" },
  "fields": [
    { "name": "Author", "value": "{author_tag} ({author_mention})", "inline": true },
    { "name": "Channel", "value": "{channel}", "inline": true },
    { "name": "Message ID", "value": "`{message_id}`", "inline": true },
    { "name": "Before", "value": "{before}", "inline": false },
    { "name": "After", "value": "{after}", "inline": false }
  ]
}'::text
WHERE key = 'mod_log_embed_message_edit' AND COALESCE(trim(value), '') = '';

UPDATE skz_bot_settings SET value = '{
  "title": "{event_title}",
  "description": "",
  "color": 15548997,
  "url": "",
  "author": { "name": "", "url": "", "icon_url": "" },
  "thumbnail": { "url": "" },
  "image": { "url": "" },
  "footer": { "text": "", "icon_url": "" },
  "fields": [
    { "name": "Channel", "value": "{channel}", "inline": true },
    { "name": "Count", "value": "{count}", "inline": true },
    { "name": "Sample messages", "value": "{samples}", "inline": false }
  ]
}'::text
WHERE key = 'mod_log_embed_message_bulk_delete' AND COALESCE(trim(value), '') = '';
