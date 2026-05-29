/**
 * Discord CDN avatar URLs (user id + avatar hash from the API).
 * @see https://discord.com/developers/docs/reference#image-formatting
 */

export function discordAvatarUrl(discordUserId, avatarHash, size = 128) {
  const id = String(discordUserId ?? '').trim()
  const hash = String(avatarHash ?? '').trim()
  if (id && hash) {
    const ext = hash.startsWith('a_') ? 'gif' : 'png'
    return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=${size}`
  }
  if (!id) return 'https://cdn.discordapp.com/embed/avatars/0.png'
  const index = Number((BigInt(id) >> 22n) % 6n)
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`
}
