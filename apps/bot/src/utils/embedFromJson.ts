import { EmbedBuilder } from 'discord.js'

export function embedFromJson(raw: Record<string, unknown>): EmbedBuilder {
  const embed = new EmbedBuilder()
  if (typeof raw['title'] === 'string' && raw['title']) embed.setTitle(raw['title'])
  if (typeof raw['description'] === 'string' && raw['description']) {
    embed.setDescription(raw['description'])
  }
  if (typeof raw['color'] === 'number') embed.setColor(raw['color'])
  if (typeof raw['url'] === 'string' && raw['url']) embed.setURL(raw['url'])
  if (raw['author'] && typeof raw['author'] === 'object') {
    const a = raw['author'] as { name?: string; url?: string; icon_url?: string }
    if (a.name) {
      embed.setAuthor({
        name: a.name,
        url: a.url || undefined,
        iconURL: a.icon_url || undefined,
      })
    }
  }
  if (raw['thumbnail'] && typeof raw['thumbnail'] === 'object') {
    const url = (raw['thumbnail'] as { url?: string }).url
    if (url) embed.setThumbnail(url)
  }
  if (raw['image'] && typeof raw['image'] === 'object') {
    const url = (raw['image'] as { url?: string }).url
    if (url) embed.setImage(url)
  }
  if (raw['footer'] && typeof raw['footer'] === 'object') {
    const footer = raw['footer'] as { text?: string; icon_url?: string }
    if (footer.text) {
      embed.setFooter({
        text: footer.text,
        iconURL: footer.icon_url || undefined,
      })
    }
  }
  if (Array.isArray(raw['fields'])) {
    for (const field of raw['fields']) {
      if (!field || typeof field !== 'object') continue
      const f = field as { name?: string; value?: string; inline?: boolean }
      if (f.name && f.value) {
        embed.addFields({ name: f.name, value: f.value, inline: !!f.inline })
      }
    }
  }
  return embed
}
