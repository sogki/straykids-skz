import type { ModLogEmbedShape, ModLogEmbedTemplates } from '../services/modLogSettings.js'
import { buildConfiguredEmbed } from './buildConfiguredEmbed.js'

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

export function buildModLogEmbed(
  templates: ModLogEmbedTemplates,
  templateKey: ModLogTemplateKey,
  ctx: Record<string, string | undefined>,
) {
  const key = SETTING_KEY_BY_TEMPLATE[templateKey]
  const raw = templates[key] ?? {}
  return buildConfiguredEmbed(raw, ctx)
}
