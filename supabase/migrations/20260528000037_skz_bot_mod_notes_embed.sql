-- Customizable /notes view embed shell (note fields appended by the bot).

INSERT INTO skz_bot_settings (key, value, description)
VALUES (
  'mod_notes_view_embed',
  '{
    "title": "{event_title} — {target_display_name}",
    "description": "{target_mention} · `{target_user_id}`",
    "color": 5793266,
    "url": "",
    "author": { "name": "", "url": "", "icon_url": "" },
    "thumbnail": { "url": "{avatar_url}" },
    "image": { "url": "" },
    "footer": { "text": "Page {page} of {total_pages} · {total_notes} note(s)", "icon_url": "" },
    "fields": []
  }',
  'JSON embed template for /notes view (individual notes added as fields when posted)'
)
ON CONFLICT (key) DO NOTHING;
