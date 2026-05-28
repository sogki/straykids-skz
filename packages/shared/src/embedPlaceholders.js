/** Tokens available in embed title, description, fields, footer, etc. */
export const EMBED_PLACEHOLDERS = [
  { token: '{username}', description: "Member's Discord username" },
  { token: '{displayname}', description: 'Server nickname or display name' },
  { token: '{mention}', description: 'Mentions the member (@user)' },
  { token: '{server}', description: 'Server name' },
  { token: '{member_count}', description: 'Approximate member count' },
  { token: '{role}', description: 'Discord role name (feedback messages)' },
]

export const FEEDBACK_PLACEHOLDERS = EMBED_PLACEHOLDERS

export const PREVIEW_PLACEHOLDER_CONTEXT = {
  username: 'Username',
  displayname: 'Display Name',
  mention: '@User',
  server: 'SKZ Arcade',
  member_count: '1,234',
  role: 'Member',
}

export function resolvePlaceholders(text, ctx) {
  if (!text) return ''
  let out = String(text)
  for (const [key, val] of Object.entries(ctx ?? {})) {
    out = out.replaceAll(`{${key}}`, val != null ? String(val) : '')
  }
  return out
}

export function resolveEmbedPlaceholders(embed, ctx) {
  const out = { ...embed }
  if (typeof out.title === 'string') out.title = resolvePlaceholders(out.title, ctx)
  if (typeof out.description === 'string') {
    out.description = resolvePlaceholders(out.description, ctx)
  }
  if (typeof out.url === 'string') out.url = resolvePlaceholders(out.url, ctx)
  if (out.author && typeof out.author === 'object') {
    const a = { ...out.author }
    if (typeof a.name === 'string') a.name = resolvePlaceholders(a.name, ctx)
    if (typeof a.url === 'string') a.url = resolvePlaceholders(a.url, ctx)
    out.author = a
  }
  if (out.footer && typeof out.footer === 'object') {
    const f = { ...out.footer }
    if (typeof f.text === 'string') f.text = resolvePlaceholders(f.text, ctx)
    out.footer = f
  }
  if (Array.isArray(out.fields)) {
    out.fields = out.fields.map((field) => {
      if (!field || typeof field !== 'object') return field
      const f = { ...field }
      if (typeof f.name === 'string') f.name = resolvePlaceholders(f.name, ctx)
      if (typeof f.value === 'string') f.value = resolvePlaceholders(f.value, ctx)
      return f
    })
  }
  return out
}

export function placeholderContextFromMember(member, guild) {
  return {
    username: member.user.username,
    displayname: member.displayName || member.user.username,
    mention: `<@${member.user.id}>`,
    server: guild.name,
    member_count: guild.memberCount ?? undefined,
  }
}
