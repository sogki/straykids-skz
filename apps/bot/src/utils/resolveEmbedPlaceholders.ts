/** Resolve {token} placeholders in embed JSON using a string context map. */

export function resolvePlaceholders(
  text: string,
  ctx: Record<string, string | undefined>,
): string {
  if (!text) return ''
  let out = String(text)
  for (const [key, val] of Object.entries(ctx)) {
    out = out.replaceAll(`{${key}}`, val ?? '')
  }
  return out
}

export function resolveEmbedPlaceholders(
  embed: Record<string, unknown>,
  ctx: Record<string, string | undefined>,
): Record<string, unknown> {
  const out = { ...embed }
  if (typeof out.title === 'string') out.title = resolvePlaceholders(out.title, ctx)
  if (typeof out.description === 'string') {
    out.description = resolvePlaceholders(out.description, ctx)
  }
  if (typeof out.url === 'string') out.url = resolvePlaceholders(out.url, ctx)
  if (out.author && typeof out.author === 'object') {
    const a = { ...(out.author as Record<string, unknown>) }
    if (typeof a.name === 'string') a.name = resolvePlaceholders(a.name, ctx)
    if (typeof a.url === 'string') a.url = resolvePlaceholders(a.url, ctx)
    out.author = a
  }
  if (out.footer && typeof out.footer === 'object') {
    const f = { ...(out.footer as Record<string, unknown>) }
    if (typeof f.text === 'string') f.text = resolvePlaceholders(f.text, ctx)
    out.footer = f
  }
  if (Array.isArray(out.fields)) {
    out.fields = out.fields.map((field) => {
      if (!field || typeof field !== 'object') return field
      const f = { ...(field as Record<string, unknown>) }
      if (typeof f.name === 'string') f.name = resolvePlaceholders(f.name, ctx)
      if (typeof f.value === 'string') f.value = resolvePlaceholders(f.value, ctx)
      return f
    })
  }
  if (out.thumbnail && typeof out.thumbnail === 'object') {
    const t = { ...(out.thumbnail as Record<string, unknown>) }
    if (typeof t.url === 'string') t.url = resolvePlaceholders(t.url, ctx)
    out.thumbnail = t
  }
  if (out.image && typeof out.image === 'object') {
    const i = { ...(out.image as Record<string, unknown>) }
    if (typeof i.url === 'string') i.url = resolvePlaceholders(i.url, ctx)
    out.image = i
  }
  return out
}
