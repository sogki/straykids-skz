import type { ModLogEmbedShape } from './modLogSettings.js'

export const DEFAULT_MOD_NOTES_VIEW_EMBED: ModLogEmbedShape = {
  title: '{event_title} — {target_display_name}',
  description: '{target_mention} · `{target_user_id}`',
  color: 0x5865f2,
  url: '',
  author: { name: '', url: '', icon_url: '' },
  thumbnail: { url: '{avatar_url}' },
  image: { url: '' },
  footer: { text: 'Page {page} of {total_pages} · {total_notes} note(s)', icon_url: '' },
  fields: [],
}
