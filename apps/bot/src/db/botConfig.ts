import { supabase } from './supabase.js'

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
  channelId: string
  messageId: string
  emoji: string
  roleId: string
  category: 'verify' | 'pronouns' | 'colors' | 'general' | 'other'
  label: string
  removeOnUnreact: boolean
  sortOrder: number
  isActive: boolean
}

export interface BotConfig {
  settings: BotSettings
  reactionRoles: ReactionRoleRow[]
  /** Lookup: messageId → emoji → reaction-role row. */
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
    channelId: String(row['channel_id']),
    messageId: String(row['message_id']),
    emoji: String(row['emoji']),
    roleId: String(row['role_id']),
    category: (row['category'] as ReactionRoleRow['category']) ?? 'general',
    label: String(row['label'] ?? ''),
    removeOnUnreact: Boolean(row['remove_on_unreact']),
    sortOrder: Number(row['sort_order'] ?? 0),
    isActive: Boolean(row['is_active'] ?? true),
  }
}

function buildIndex(rows: ReactionRoleRow[]) {
  const idx = new Map<string, Map<string, ReactionRoleRow>>()
  for (const row of rows) {
    if (!row.isActive) continue
    let inner = idx.get(row.messageId)
    if (!inner) {
      inner = new Map()
      idx.set(row.messageId, inner)
    }
    inner.set(row.emoji, row)
  }
  return idx
}

/**
 * Pull the latest settings and reaction-role rows from Supabase and swap
 * them into the cache atomically.
 */
export async function reloadBotConfig(): Promise<BotConfig> {
  const [settingsRes, rolesRes] = await Promise.all([
    supabase.from('skz_bot_settings').select('key, value'),
    supabase.from('skz_bot_reaction_roles').select('*'),
  ])

  if (settingsRes.error) {
    throw new Error(`Failed to load bot settings: ${settingsRes.error.message}`)
  }
  if (rolesRes.error) {
    throw new Error(
      `Failed to load reaction roles: ${rolesRes.error.message}`,
    )
  }

  const settingsMap: Record<string, string> = {}
  for (const row of settingsRes.data ?? []) {
    settingsMap[row.key as string] = String(row.value ?? '')
  }

  const reactionRoles = (rolesRes.data ?? []).map(parseReactionRole)

  cached = {
    settings: parseSettings(settingsMap),
    reactionRoles,
    reactionRolesIndex: buildIndex(reactionRoles),
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
  return cached.reactionRolesIndex.get(messageId)?.get(emoji)
}
