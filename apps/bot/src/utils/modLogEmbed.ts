import { EmbedBuilder } from 'discord.js'
import { embedFromJson } from './embedFromJson.js'
import { resolveEmbedPlaceholders } from './resolveEmbedPlaceholders.js'
import type { ModLogEmbedShape, ModLogEmbedTemplates } from '../services/modLogSettings.js'

export type ModLogTemplateKey =
  | 'member'
  | 'message_delete'
  | 'message_edit'
  | 'message_bulk_delete'

const SETTING_KEY_BY_TEMPLATE: Record<
  ModLogTemplateKey,
  keyof ModLogEmbedTemplates
> = {
  member: 'member',
  message_delete: 'messageDelete',
  message_edit: 'messageEdit',
  message_bulk_delete: 'messageBulkDelete',
}

function stripEmptyFooter(embedJson: ModLogEmbedShape): Record<string, unknown> {
  const footer = embedJson.footer
  const text = String(footer?.text ?? '').trim()
  if (!text || /^Requested by\s*$/i.test(text)) {
    const { footer: _f, ...rest } = embedJson
    return rest as Record<string, unknown>
  }
  return embedJson as Record<string, unknown>
}

export function buildModLogEmbed(
  templates: ModLogEmbedTemplates,
  templateKey: ModLogTemplateKey,
  ctx: Record<string, string | undefined>,
): EmbedBuilder {
  const key = SETTING_KEY_BY_TEMPLATE[templateKey]
  const raw = templates[key] ?? {}
  const resolved = resolveEmbedPlaceholders(stripEmptyFooter({ ...raw }), ctx)

  const embed = embedFromJson(resolved)
  embed.setTimestamp()

  const thumbTemplate = String(
    (raw.thumbnail as { url?: string } | undefined)?.url ?? '',
  )
  if (
    thumbTemplate.includes('{avatar_url}') &&
    ctx.avatar_url &&
    /^https?:\/\//i.test(ctx.avatar_url)
  ) {
    embed.setThumbnail(ctx.avatar_url)
  }

  const urlTemplate = String(raw.url ?? '')
  if (urlTemplate.includes('{url}') && ctx.url && /^https?:\/\//i.test(ctx.url)) {
    embed.setURL(ctx.url)
  }

  return embed
}
