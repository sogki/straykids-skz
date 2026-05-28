import {
  ChannelType,
  type Client,
  type Guild,
  type TextChannel,
} from 'discord.js'
import { getBotConfig } from '../db/botConfig.js'
import { getSupabase } from '../db/supabase.js'

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
export async function syncDiscordCache(client: Client): Promise<number> {
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
    entity_type: 'channel' | 'role'
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
  await db.from('skz_bot_discord_cache').delete().eq('guild_id', guildId)

  if (rows.length > 0) {
    const { error } = await db.from('skz_bot_discord_cache').insert(rows)
    if (error) throw new Error(`Discord cache insert failed: ${error.message}`)
  }

  // Sync member-role cache for Discord OAuth RBAC in admin panel.
  // This may fail if member intents or permissions are unavailable; continue gracefully.
  try {
    const members = await guild.members.fetch()
    const memberRows = Array.from(members.values()).map((m) => ({
      discord_user_id: m.user.id,
      guild_id: guildId,
      display_name: m.displayName || m.user.username,
      role_ids: Array.from(m.roles.cache.keys()).filter((id) => id !== guildId),
      synced_at: new Date().toISOString(),
    }))
    await db.from('skz_admin_discord_member_roles_cache').delete().eq('guild_id', guildId)
    if (memberRows.length > 0) {
      const { error } = await db.from('skz_admin_discord_member_roles_cache').upsert(memberRows, {
        onConflict: 'discord_user_id',
      })
      if (error) {
        console.warn('[skz-bot] member-role cache upsert failed:', error.message)
      }
    }
  } catch (err) {
    console.warn('[skz-bot] member-role cache sync skipped:', err)
  }

  console.log(`[skz-bot] synced ${rows.length} Discord entities for guild ${guildId}`)
  return rows.length
}
