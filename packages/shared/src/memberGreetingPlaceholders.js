/** Placeholders for welcome / goodbye member embeds (join & leave). */

export const MEMBER_GREETING_PLACEHOLDERS = [
  { token: '{username}', description: "Member's Discord username" },
  { token: '{displayname}', description: 'Server nickname or display name' },
  { token: '{mention}', description: 'Mentions the member' },
  { token: '{tag}', description: 'Full username tag' },
  { token: '{user_id}', description: 'Discord user ID' },
  { token: '{server}', description: 'Server name' },
  { token: '{member_count}', description: 'Approximate member count after join' },
  { token: '{account_created}', description: 'Account created (Discord timestamp)' },
  { token: '{joined_at}', description: 'Joined server (Discord timestamp)' },
  { token: '{left_at}', description: 'Left server (Discord timestamp, goodbye only)' },
  { token: '{is_bot}', description: 'Yes or No' },
  { token: '{roles}', description: 'Comma-separated role mentions' },
  { token: '{avatar_url}', description: 'Avatar URL (use in thumbnail URL)' },
  { token: '{event_title}', description: 'Embed title override' },
]

export const WELCOME_PREVIEW_CTX = {
  username: 'new_stay',
  displayname: 'New STAY',
  mention: '@new_stay',
  tag: 'new_stay',
  user_id: '123456789012345678',
  server: 'Stay Café',
  member_count: '1,024',
  account_created: '<t:1600000000:F>',
  joined_at: '<t:1700000000:F>',
  left_at: '—',
  is_bot: 'No',
  roles: '@Member, @QOTD',
  avatar_url: '',
  event_title: 'Welcome',
}

export const GOODBYE_PREVIEW_CTX = {
  ...WELCOME_PREVIEW_CTX,
  event_title: 'Goodbye',
  left_at: '<t:1700003600:F>',
}
