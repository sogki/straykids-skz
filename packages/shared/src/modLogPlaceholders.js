import { resolveEmbedPlaceholders, resolvePlaceholders } from './embedPlaceholders.js'

/** Placeholders for member join / account lookup mod log embeds. */
export const MOD_LOG_MEMBER_PLACEHOLDERS = [
  { token: '{username}', description: "Member's Discord username" },
  { token: '{displayname}', description: 'Server nickname or display name' },
  { token: '{mention}', description: 'Mentions the member' },
  { token: '{tag}', description: 'Full username tag' },
  { token: '{user_id}', description: 'Discord user ID' },
  { token: '{server}', description: 'Server name' },
  { token: '{member_count}', description: 'Approximate member count' },
  { token: '{account_created}', description: 'Account created (Discord timestamp)' },
  { token: '{joined_at}', description: 'Joined server (Discord timestamp)' },
  { token: '{is_bot}', description: 'Yes or No' },
  { token: '{roles}', description: 'Comma-separated role mentions' },
  { token: '{avatar_url}', description: 'Avatar URL (use in thumbnail URL)' },
  { token: '{event_title}', description: 'Event title (join vs lookup)' },
  { token: '{requested_by}', description: 'Staff who ran /info (footer)' },
]

/** Placeholders for message delete / edit / bulk mod log embeds. */
export const MOD_LOG_MESSAGE_PLACEHOLDERS = [
  { token: '{author}', description: 'Message author tag' },
  { token: '{author_mention}', description: 'Mention the author' },
  { token: '{author_tag}', description: 'Same as {author}' },
  { token: '{channel}', description: 'Channel mention' },
  { token: '{message_id}', description: 'Deleted/edited message ID' },
  { token: '{content}', description: 'Message body (delete)' },
  { token: '{before}', description: 'Content before edit' },
  { token: '{after}', description: 'Content after edit' },
  { token: '{url}', description: 'Jump link to message (edit)' },
  { token: '{count}', description: 'Number of messages (bulk)' },
  { token: '{samples}', description: 'Sample lines (bulk)' },
  { token: '{event_title}', description: 'Embed title override' },
]

export const MOD_LOG_PREVIEW_MEMBER = {
  username: 'stay_fan',
  displayname: 'STAY Fan',
  mention: '@stay_fan',
  tag: 'stay_fan',
  user_id: '123456789012345678',
  server: 'SKZ Arcade',
  member_count: '24',
  account_created: '<t:1600000000:F>',
  joined_at: '<t:1700000000:F>',
  is_bot: 'No',
  roles: '@Member, @STAY',
  avatar_url: '',
  event_title: 'Member joined',
  requested_by: 'ModUser',
}

export const MOD_LOG_PREVIEW_MESSAGE_DELETE = {
  author: 'stay_fan',
  author_mention: '@stay_fan',
  author_tag: 'stay_fan',
  channel: '#general',
  message_id: '999888777666555444',
  content: 'Hello STAY!',
  event_title: 'Message deleted',
}

export const MOD_LOG_PREVIEW_MESSAGE_EDIT = {
  ...MOD_LOG_PREVIEW_MESSAGE_DELETE,
  before: 'Hello STAY!',
  after: 'Hello STAY!! 🎉',
  url: 'https://discord.com',
  event_title: 'Message edited',
}

export const MOD_LOG_PREVIEW_MESSAGE_BULK = {
  channel: '#general',
  count: '12',
  samples: '• **user_a**: first message\n• **user_b**: second message',
  event_title: 'Bulk message delete',
}

/** Resolve all {key} tokens from ctx on every embed text field (mod-log + panel embeds). */
export function resolveModLogPlaceholders(embed, ctx) {
  return resolveEmbedPlaceholders(embed, ctx)
}

export function resolveModLogText(text, ctx) {
  return resolvePlaceholders(text, ctx)
}
