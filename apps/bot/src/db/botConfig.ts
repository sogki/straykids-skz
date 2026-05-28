import { getSupabase } from './supabase.js'
import { normalizeEmojiKey } from '../utils/discordEmoji.js'

/**
 * Operational config the bot loads from the database. Hot-reloadable —
 * call `reloadBotConfig()` (or trigger it via the `/reload` slash command)
 * to pick up admin-panel changes without restarting the process.
 */

export interface BotSettings {
  guildId: string | null
  verifyChannelId: string | null
  verifyMessageId: string | null
  verifyEmoji: string | null
  verifyRoleId: string | null
  joinToCreateChannelId: string | null
  joinToCreateCategoryId: string | null
  joinToCreateNamePattern: string
}

export interface ReactionRoleRow {
  id: string
  botMessageId: string | null
  channelId: string
  messageId: string
  emoji: string
  buttonEmoji: string
  roleId: string
  category: 'verify' | 'pronouns' | 'colors' | 'general' | 'other'
  label: string
  buttonStyle: string | null
  removeOnUnreact: boolean
  sortOrder: number
  isActive: boolean
}

export interface BotMessageRow {
  id: string
  slug: string
  label: string
  kind: 'verify' | 'reaction_roles' | 'general'
  channelId: string
  discordMessageId: string | null
  embed: Record<string, unknown>
  interactionMode: 'reaction' | 'button' | 'both'
  isActive: boolean
  sortOrder: number
}

export interface BotConfig {
  settings: BotSettings
  messages: BotMessageRow[]
  reactionRoles: ReactionRoleRow[]
  reactionRolesIndex: Map<string, Map<string, ReactionRoleRow>>
  loadedAt: Date
}

const DEFAULT_SETTINGS: BotSettings = {
  guildId: null,
  verifyChannelId: null,
  verifyMessageId: null,
  verifyEmoji: null,
  verifyRoleId: null,
  joinToCreateChannelId: null,
  joinToCreateCategoryId: null,
  joinToCreateNamePattern: "{username}'s vc",
}

let cached: BotConfig = makeEmptyConfig()

function makeEmptyConfig(): BotConfig {
  return {
    settings: { ...DEFAULT_SETTINGS },
    messages: [],
    reactionRoles: [],
    reactionRolesIndex: new Map(),
    loadedAt: new Date(0),
  }
}

/** Read-only accessor. Returns the most recently loaded snapshot. */
export function getBotConfig(): BotConfig {
  return cached
}

function emptyToNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function parseSettings(raw: Record<string, string> | null): BotSettings {
  const r = raw ?? {}
  return {
    guildId: emptyToNull(r['guild_id']),
    verifyChannelId: emptyToNull(r['verify_channel_id']),
    verifyMessageId: emptyToNull(r['verify_message_id']),
    verifyEmoji: emptyToNull(r['verify_emoji']),
    verifyRoleId: emptyToNull(r['verify_role_id']),
    joinToCreateChannelId: emptyToNull(r['join_to_create_channel_id']),
    joinToCreateCategoryId: emptyToNull(r['join_to_create_category_id']),
    joinToCreateNamePattern:
      emptyToNull(r['join_to_create_name_pattern']) ??
      DEFAULT_SETTINGS.joinToCreateNamePattern,
  }
}

function parseReactionRole(row: Record<string, unknown>): ReactionRoleRow {
  return {
    id: String(row['id']),
    botMessageId: row['bot_message_id'] ? String(row['bot_message_id']) : null,
    channelId: String(row['channel_id']),
    messageId: String(row['message_id']),
    emoji: String(row['emoji']),
    buttonEmoji: String(row['button_emoji'] ?? ''),
    roleId: String(row['role_id']),
    category: (row['category'] as ReactionRoleRow['category']) ?? 'general',
    label: String(row['label'] ?? ''),
    buttonStyle: row['button_style'] ? String(row['button_style']) : null,
    removeOnUnreact: Boolean(row['remove_on_unreact']),
    sortOrder: Number(row['sort_order'] ?? 0),
    isActive: Boolean(row['is_active'] ?? true),
  }
}

function parseBotMessage(row: Record<string, unknown>): BotMessageRow {
  return {
    id: String(row['id']),
    slug: String(row['slug']),
    label: String(row['label'] ?? ''),
    kind: (row['kind'] as BotMessageRow['kind']) ?? 'reaction_roles',
    channelId: String(row['channel_id'] ?? ''),
    discordMessageId: row['discord_message_id']
      ? String(row['discord_message_id'])
      : null,
    embed: (row['embed'] as Record<string, unknown>) ?? {},
    interactionMode:
      (row['interaction_mode'] as BotMessageRow['interactionMode']) ?? 'reaction',
    isActive: Boolean(row['is_active'] ?? true),
    sortOrder: Number(row['sort_order'] ?? 0),
  }
}

function buildIndex(rows: ReactionRoleRow[], messages: BotMessageRow[]) {
  const discordIdByPanel = new Map<string, string>()
  for (const message of messages) {
    if (message.discordMessageId) {
      discordIdByPanel.set(message.id, message.discordMessageId)
    }
  }

  const idx = new Map<string, Map<string, ReactionRoleRow>>()

  const register = (messageId: string, emoji: string, row: ReactionRoleRow) => {
    if (!messageId) return
    let inner = idx.get(messageId)
    if (!inner) {
      inner = new Map()
      idx.set(messageId, inner)
    }
    inner.set(normalizeEmojiKey(emoji), row)
    if (emoji !== normalizeEmojiKey(emoji)) {
      inner.set(emoji, row)
    }
  }

  for (const row of rows) {
    if (!row.isActive) continue
    register(row.messageId, row.emoji, row)
    if (row.botMessageId) {
      const discordId = discordIdByPanel.get(row.botMessageId)
      if (discordId) register(discordId, row.emoji, row)
    }
  }

  return idx
}

/**
 * Pull the latest settings and reaction-role rows from Supabase and swap
 * them into the cache atomically.
 */
export async function reloadBotConfig(): Promise<BotConfig> {
  const db = getSupabase()
  const [settingsRes, rolesRes, messagesRes] = await Promise.all([
    db.from('skz_bot_settings').select('key, value'),
    db.from('skz_bot_reaction_roles').select('*'),
    db.from('skz_bot_messages').select('*'),
  ])

  if (settingsRes.error) {
    throw new Error(`Failed to load bot settings: ${settingsRes.error.message}`)
  }
  if (rolesRes.error) {
    throw new Error(
      `Failed to load reaction roles: ${rolesRes.error.message}`,
    )
  }
  if (messagesRes.error) {
    throw new Error(`Failed to load bot messages: ${messagesRes.error.message}`)
  }

  const settingsMap: Record<string, string> = {}
  for (const row of settingsRes.data ?? []) {
    settingsMap[row.key as string] = String(row.value ?? '')
  }

  const reactionRoles = (rolesRes.data ?? []).map(parseReactionRole)
  const messages = (messagesRes.data ?? []).map(parseBotMessage)

  cached = {
    settings: parseSettings(settingsMap),
    messages,
    reactionRoles,
    reactionRolesIndex: buildIndex(reactionRoles, messages),
    loadedAt: new Date(),
  }

  return cached
}

/**
 * Lookup helper — returns the reaction-role mapping for a given
 * (messageId, emoji) pair, or undefined if there's no match.
 */
export function findReactionRole(
  messageId: string,
  emoji: string,
): ReactionRoleRow | undefined {
  const inner = cached.reactionRolesIndex.get(messageId)
  const key = normalizeEmojiKey(emoji)
  const fromIndex = inner?.get(key) ?? inner?.get(emoji)
  if (fromIndex) return fromIndex

  for (const row of cached.reactionRoles) {
    if (!row.isActive) continue
    if (normalizeEmojiKey(row.emoji) !== key && row.emoji !== emoji) continue
    if (row.messageId === messageId) return row
    const panel = row.botMessageId
      ? cached.messages.find((m) => m.id === row.botMessageId)
      : undefined
    if (panel?.discordMessageId === messageId) return row
  }

  return undefined
}
