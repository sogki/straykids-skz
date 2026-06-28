import { discordAvatarUrl } from '@skz/shared'
import {
  ChannelType,
  type Client,
  type Guild,
  type GuildMember,
  type TextChannel,
} from 'discord.js'
import { getBotConfig } from '../db/botConfig.js'
import { getSupabase } from '../db/supabase.js'
import { recordCacheSync } from './botHealth.js'

async function memberProfile(m: GuildMember) {
  const user = m.user.partial ? await m.user.fetch() : m.user
  const loginName = String(user.username ?? '').trim()
  const avatarHash = user.avatar
  const displayName = m.displayName || user.globalName || loginName
  return {
    username: loginName,
    displayName,
    avatarHash,
    avatarUrl: discordAvatarUrl(user.id, avatarHash, 128),
  }
}

const TEXT_LIKE = new Set<number>([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildCategory,
])

const VOICE_LIKE = new Set<number>([
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
])

/**
 * Pull channels + roles from Discord and write them to skz_bot_discord_cache
 * so the admin panel can render dropdowns without calling Discord directly.
 */
async function syncBotProfile(client: Client): Promise<void> {
  const user = client.user?.partial ? await client.user.fetch() : client.user
  if (!user) return
  const db = getSupabase()
  const rows = [
    { key: 'bot_discord_user_id', value: user.id },
    { key: 'bot_username', value: user.username },
    { key: 'bot_global_name', value: user.globalName ?? '' },
    { key: 'bot_avatar_hash', value: user.avatar ?? '' },
  ]
  for (const row of rows) {
    const { error } = await db
      .from('skz_bot_settings')
      .upsert({ key: row.key, value: row.value }, { onConflict: 'key' })
    if (error) {
      console.warn(`[skz-bot] bot profile setting ${row.key} upsert failed:`, error.message)
    }
  }
}

export async function syncDiscordCache(client: Client): Promise<number> {
  await syncBotProfile(client)

  const guildId = getBotConfig().settings.guildId
  if (!guildId) {
    console.warn('[skz-bot] syncDiscordCache skipped — guild_id not set')
    return 0
  }

  let guild: Guild
  try {
    guild = await client.guilds.fetch(guildId)
  } catch (err) {
    console.error('[skz-bot] could not fetch guild for cache sync:', err)
    return 0
  }

  await guild.channels.fetch()
  await guild.roles.fetch()

  const rows: Array<{
    guild_id: string
    entity_type: 'channel' | 'role' | 'member'
    entity_id: string
    name: string
    parent_id: string | null
    channel_type: number | null
    position: number
    extra: Record<string, unknown>
  }> = []

  for (const ch of guild.channels.cache.values()) {
    if (!TEXT_LIKE.has(ch.type) && !VOICE_LIKE.has(ch.type)) continue
    rows.push({
      guild_id: guildId,
      entity_type: 'channel',
      entity_id: ch.id,
      name: ch.name,
      parent_id: 'parentId' in ch && ch.parentId ? ch.parentId : null,
      channel_type: ch.type,
      position: 'rawPosition' in ch ? (ch.rawPosition ?? 0) : 0,
      extra: {
        kind: ch.type === ChannelType.GuildCategory
          ? 'category'
          : VOICE_LIKE.has(ch.type)
            ? 'voice'
            : 'text',
      },
    })
  }

  for (const role of guild.roles.cache.values()) {
    if (role.name === '@everyone') continue
    rows.push({
      guild_id: guildId,
      entity_type: 'role',
      entity_id: role.id,
      name: role.name,
      parent_id: null,
      channel_type: null,
      position: role.rawPosition,
      extra: {
        color: role.color,
        managed: role.managed,
      },
    })
  }

  const db = getSupabase()
  const channelRoleRows = rows.filter((r) => r.entity_type !== 'member')
  const memberCacheRows: typeof rows = []
  const memberRowsForRoles: Array<{
    discord_user_id: string
    guild_id: string
    username: string
    display_name: string
    avatar_hash: string
    avatar_url: string
    role_ids: string[]
    synced_at: string
  }> = []

  // Members — requires Server Members intent; always written to member_roles_cache.
  let memberCount = 0
  try {
    const members = await guild.members.fetch()
    let position = 0
    for (const m of members.values()) {
      const profile = await memberProfile(m)
      memberCacheRows.push({
        guild_id: guildId,
        entity_type: 'member',
        entity_id: m.user.id,
        name: profile.displayName,
        parent_id: null,
        channel_type: null,
        position: position++,
        extra: {
          username: profile.username,
          global_name: m.user.globalName ?? null,
          display_name: profile.displayName,
          avatar_hash: profile.avatarHash,
          avatar_url: profile.avatarUrl,
        },
      })
      memberRowsForRoles.push({
        discord_user_id: m.user.id,
        guild_id: guildId,
        username: profile.username,
        display_name: profile.displayName,
        avatar_hash: profile.avatarHash ?? '',
        avatar_url: profile.avatarUrl,
        role_ids: Array.from(m.roles.cache.keys()).filter((id) => id !== guildId),
        synced_at: new Date().toISOString(),
      })
    }
    memberCount = position
  } catch (err) {
    console.warn('[skz-bot] member directory sync skipped:', err)
  }

  await db.from('skz_bot_discord_cache').delete().eq('guild_id', guildId)

  async function insertCacheChunks(items: typeof rows, label: string) {
    if (items.length === 0) return
    const chunkSize = 500
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize)
      const { error } = await db.from('skz_bot_discord_cache').insert(chunk)
      if (error) {
        throw new Error(`${label} cache insert failed: ${error.message}`)
      }
    }
  }

  // Channels + roles must succeed even if member rows are rejected (e.g. migration 38 not applied).
  await insertCacheChunks(channelRoleRows, 'Channel/role')

  if (memberCacheRows.length > 0) {
    try {
      await insertCacheChunks(memberCacheRows, 'Member')
    } catch (err) {
      console.warn(
        '[skz-bot] member discord_cache insert skipped (apply migration 20260528000038):',
        err instanceof Error ? err.message : err,
      )
    }
  }

  if (memberRowsForRoles.length > 0) {
    await db.from('skz_admin_discord_member_roles_cache').delete().eq('guild_id', guildId)
    let rolesCached = 0
    let missingLogin = 0
    for (let i = 0; i < memberRowsForRoles.length; i += 500) {
      const chunk = memberRowsForRoles.slice(i, i + 500)
      const { error } = await db.from('skz_admin_discord_member_roles_cache').insert(chunk)
      if (error) {
        console.error('[skz-bot] member-role cache insert failed:', error.message)
        break
      }
      rolesCached += chunk.length
      missingLogin += chunk.filter((row) => !row.username?.trim()).length
    }
    if (missingLogin > 0) {
      console.warn(
        `[skz-bot] ${missingLogin} member(s) synced without Discord login username — check Server Members Intent`,
      )
    }
    console.log(
      `[skz-bot] wrote ${rolesCached} rows to member_roles_cache (${memberCount} fetched) for guild ${guildId}`,
    )
  }

  const totalCached = channelRoleRows.length + memberCacheRows.length
  console.log(
    `[skz-bot] synced ${totalCached} Discord cache rows (${memberCount} members in role cache) for guild ${guildId}`,
  )
  await recordCacheSync()
  return totalCached
}
