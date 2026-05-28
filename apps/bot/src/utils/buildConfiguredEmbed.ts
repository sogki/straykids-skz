import { EmbedBuilder } from 'discord.js'
import { embedFromJson } from './embedFromJson.js'
import { resolveEmbedPlaceholders } from './resolveEmbedPlaceholders.js'
import type { ModLogEmbedShape } from '../services/modLogSettings.js'

function stripEmptyFooter(embedJson: ModLogEmbedShape): Record<string, unknown> {
  const footer = embedJson.footer
  const text = String(footer?.text ?? '').trim()
  if (!text || /^Requested by\s*$/i.test(text)) {
    const { footer: _f, ...rest } = embedJson
    return rest as Record<string, unknown>
  }
  return embedJson as Record<string, unknown>
}

/** Build a Discord embed from stored JSON + placeholder context. */
export function buildConfiguredEmbed(
  embedJson: ModLogEmbedShape,
  ctx: Record<string, string | undefined>,
): EmbedBuilder {
  const resolved = resolveEmbedPlaceholders(stripEmptyFooter({ ...embedJson }), ctx)
  const embed = embedFromJson(resolved)
  embed.setTimestamp()

  const thumbTemplate = String(
    (embedJson.thumbnail as { url?: string } | undefined)?.url ?? '',
  )
  if (
    thumbTemplate.includes('{avatar_url}') &&
    ctx.avatar_url &&
    /^https?:\/\//i.test(ctx.avatar_url)
  ) {
    embed.setThumbnail(ctx.avatar_url)
  }

  const urlTemplate = String(embedJson.url ?? '')
  if (urlTemplate.includes('{url}') && ctx.url && /^https?:\/\//i.test(ctx.url)) {
    embed.setURL(ctx.url)
  }

  return embed
}
