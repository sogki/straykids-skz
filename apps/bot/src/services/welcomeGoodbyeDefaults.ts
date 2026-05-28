import type { ModLogEmbedShape } from './modLogSettings.js'

/** Defaults aligned with migration 20260528000033 seed JSON. */
export const DEFAULT_WELCOME_GOODBYE_EMBEDS: Record<'welcome' | 'goodbye', ModLogEmbedShape> = {
  welcome: {
    title: 'Welcome to {server}!',
    description: 'Hey {mention} — glad you made it to Stay Café.',
    color: 0x57f287,
    url: '',
    author: { name: '', url: '', icon_url: '' },
    thumbnail: { url: '{avatar_url}' },
    image: { url: '' },
    footer: { text: '', icon_url: '' },
    fields: [
      { name: 'Member', value: '{tag}', inline: true },
      { name: 'Member #', value: '{member_count}', inline: true },
      { name: 'Account created', value: '{account_created}', inline: false },
    ],
  },
  goodbye: {
    title: 'Goodbye',
    description: '{mention} left the server.',
    color: 0xed4245,
    url: '',
    author: { name: '', url: '', icon_url: '' },
    thumbnail: { url: '{avatar_url}' },
    image: { url: '' },
    footer: { text: '', icon_url: '' },
    fields: [
      { name: 'Member', value: '{tag}', inline: true },
      { name: 'Left', value: '{left_at}', inline: true },
      { name: 'Joined', value: '{joined_at}', inline: false },
    ],
  },
}
