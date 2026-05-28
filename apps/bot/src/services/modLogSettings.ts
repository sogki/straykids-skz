import { getSupabase } from '../db/supabase.js'

export interface ModLogEmbedShape {
  title?: string
  description?: string
  color?: number
  url?: string
  author?: { name?: string; url?: string; icon_url?: string }
  thumbnail?: { url?: string }
  image?: { url?: string }
  footer?: { text?: string; icon_url?: string }
  fields?: Array<{ name?: string; value?: string; inline?: boolean }>
}

export interface ModLogEmbedTemplates {
  member: ModLogEmbedShape
  messageDelete: ModLogEmbedShape
  messageEdit: ModLogEmbedShape
  messageBulkDelete: ModLogEmbedShape
}

export interface ModLogSettings {
  enabled: boolean
  guildId: string | null
  joinChannelId: string | null
  messageChannelId: string | null
  logMemberJoin: boolean
  logMessageEdits: boolean
  logMessageDeletes: boolean
  logMessageBulkDeletes: boolean
  embedTemplates: ModLogEmbedTemplates
}

export const DEFAULT_MOD_LOG_EMBEDS: ModLogEmbedTemplates = {
  member: {
    title: '{event_title}',
    color: 0x5865f2,
    thumbnail: { url: '{avatar_url}' },
    footer: { text: 'Requested by {requested_by}', icon_url: '' },
    fields: [
      { name: 'User', value: '{tag}\n{mention}', inline: true },
      { name: 'Display name', value: '{displayname}', inline: true },
      { name: 'User ID', value: '`{user_id}`', inline: true },
      { name: 'Account created', value: '{account_created}', inline: false },
      { name: 'Joined server', value: '{joined_at}', inline: false },
      { name: 'Bot account', value: '{is_bot}', inline: true },
      { name: 'Roles', value: '{roles}', inline: false },
    ],
  },
  messageDelete: {
    title: '{event_title}',
    color: 0xed4245,
    fields: [
      { name: 'Author', value: '{author_tag} ({author_mention})', inline: true },
      { name: 'Channel', value: '{channel}', inline: true },
      { name: 'Message ID', value: '`{message_id}`', inline: true },
      { name: 'Content', value: '{content}', inline: false },
    ],
  },
  messageEdit: {
    title: '{event_title}',
    color: 0xfee75c,
    url: '{url}',
    fields: [
      { name: 'Author', value: '{author_tag} ({author_mention})', inline: true },
      { name: 'Channel', value: '{channel}', inline: true },
      { name: 'Message ID', value: '`{message_id}`', inline: true },
      { name: 'Before', value: '{before}', inline: false },
      { name: 'After', value: '{after}', inline: false },
    ],
  },
  messageBulkDelete: {
    title: '{event_title}',
    color: 0xed4245,
    fields: [
      { name: 'Channel', value: '{channel}', inline: true },
      { name: 'Count', value: '{count}', inline: true },
      { name: 'Sample messages', value: '{samples}', inline: false },
    ],
  },
}

const MOD_LOG_KEYS = [
  'mod_log_enabled',
  'guild_id',
  'mod_log_join_channel_id',
  'mod_log_message_channel_id',
  'mod_log_member_join',
  'mod_log_message_edits',
  'mod_log_message_deletes',
  'mod_log_message_bulk_deletes',
  'mod_log_embed_member',
  'mod_log_embed_message_delete',
  'mod_log_embed_message_edit',
  'mod_log_embed_message_bulk_delete',
] as const

function boolSetting(value: string | undefined, defaultValue: boolean) {
  const v = String(value ?? '').toLowerCase()
  if (v === 'true') return true
  if (v === 'false') return false
  return defaultValue
}

function emptyToNull(value: string | undefined): string | null {
  const t = String(value ?? '').trim()
  return t.length ? t : null
}

function parseEmbedJson(
  value: string | undefined,
  fallback: ModLogEmbedShape,
): ModLogEmbedShape {
  if (!value?.trim()) return { ...fallback, fields: [...(fallback.fields ?? [])] }
  try {
    const parsed = JSON.parse(value) as ModLogEmbedShape
    return {
      ...fallback,
      ...parsed,
      author: { ...fallback.author, ...parsed.author },
      thumbnail: { ...fallback.thumbnail, ...parsed.thumbnail },
      image: { ...fallback.image, ...parsed.image },
      footer: { ...fallback.footer, ...parsed.footer },
      fields: Array.isArray(parsed.fields) ? parsed.fields : fallback.fields,
    }
  } catch {
    return { ...fallback, fields: [...(fallback.fields ?? [])] }
  }
}

let cached: ModLogSettings | null = null
let cachedAt = 0
const CACHE_MS = 30_000

export async function loadModLogSettings(force = false): Promise<ModLogSettings> {
  if (!force && cached && Date.now() - cachedAt < CACHE_MS) {
    return cached
  }

  const db = getSupabase()
  const { data, error } = await db
    .from('skz_bot_settings')
    .select('key, value')
    .in('key', [...MOD_LOG_KEYS])

  if (error) throw new Error(`Mod log settings read failed: ${error.message}`)

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[String(row.key)] = String(row.value ?? '')

  cached = {
    enabled: boolSetting(map['mod_log_enabled'], false),
    guildId: emptyToNull(map['guild_id']),
    joinChannelId: emptyToNull(map['mod_log_join_channel_id']),
    messageChannelId: emptyToNull(map['mod_log_message_channel_id']),
    logMemberJoin: boolSetting(map['mod_log_member_join'], true),
    logMessageEdits: boolSetting(map['mod_log_message_edits'], true),
    logMessageDeletes: boolSetting(map['mod_log_message_deletes'], true),
    logMessageBulkDeletes: boolSetting(map['mod_log_message_bulk_deletes'], true),
    embedTemplates: {
      member: parseEmbedJson(map['mod_log_embed_member'], DEFAULT_MOD_LOG_EMBEDS.member),
      messageDelete: parseEmbedJson(
        map['mod_log_embed_message_delete'],
        DEFAULT_MOD_LOG_EMBEDS.messageDelete,
      ),
      messageEdit: parseEmbedJson(
        map['mod_log_embed_message_edit'],
        DEFAULT_MOD_LOG_EMBEDS.messageEdit,
      ),
      messageBulkDelete: parseEmbedJson(
        map['mod_log_embed_message_bulk_delete'],
        DEFAULT_MOD_LOG_EMBEDS.messageBulkDelete,
      ),
    },
  }
  cachedAt = Date.now()
  return cached
}

export function invalidateModLogSettingsCache() {
  cached = null
  cachedAt = 0
}
