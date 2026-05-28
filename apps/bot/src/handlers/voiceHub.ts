import {
  ChannelType,
  type Client,
  Events,
  type GuildMember,
  PermissionFlagsBits,
  type VoiceBasedChannel,
  type VoiceState,
} from 'discord.js'
import { getBotConfig } from '../db/botConfig.js'
import { supabase } from '../db/supabase.js'

/**
 * "Join to create" voice channels.
 *
 *   1. When a user joins the configured hub VC, we create a personal VC
 *      named per `join_to_create_name_pattern` and move them into it.
 *   2. The personal channel is recorded in skz_bot_temp_voice_channels.
 *   3. Whenever a tracked channel empties, we delete it.
 *   4. On bot startup, any tracked channel that is empty (or no longer
 *      exists) is cleaned up.
 */

function applyNamePattern(
  pattern: string,
  member: GuildMember,
): string {
  return pattern
    .replaceAll('{username}', member.user.username)
    .replaceAll('{displayname}', member.displayName)
    .slice(0, 100) // Discord channel-name limit
}

async function trackTempChannel(
  guildId: string,
  channelId: string,
  ownerUserId: string,
) {
  const { error } = await supabase
    .from('skz_bot_temp_voice_channels')
    .insert({
      guild_id: guildId,
      channel_id: channelId,
      owner_user_id: ownerUserId,
    })
  if (error) {
    console.warn(
      `[skz-bot] failed to record temp VC ${channelId}: ${error.message}`,
    )
  }
}

async function untrackTempChannel(channelId: string) {
  const { error } = await supabase
    .from('skz_bot_temp_voice_channels')
    .delete()
    .eq('channel_id', channelId)
  if (error) {
    console.warn(
      `[skz-bot] failed to untrack temp VC ${channelId}: ${error.message}`,
    )
  }
}

async function isTrackedChannel(channelId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('skz_bot_temp_voice_channels')
    .select('channel_id')
    .eq('channel_id', channelId)
    .maybeSingle()

  if (error) {
    console.warn(`[skz-bot] tracked-VC lookup failed: ${error.message}`)
    return false
  }
  return !!data
}

async function handleJoinHub(newState: VoiceState) {
  const config = getBotConfig().settings
  if (!config.joinToCreateChannelId) return
  if (newState.channelId !== config.joinToCreateChannelId) return

  const member = newState.member
  const guild = newState.guild
  if (!member || !guild) return

  // Determine where to put the personal VC. Explicit category wins; else
  // sit alongside the hub VC.
  const hubChannel = newState.channel
  const parentId =
    config.joinToCreateCategoryId ?? hubChannel?.parentId ?? null

  const name = applyNamePattern(config.joinToCreateNamePattern, member)

  let created: VoiceBasedChannel
  try {
    created = await guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      parent: parentId ?? undefined,
      permissionOverwrites: [
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers,
          ],
        },
      ],
      reason: `Join-to-create VC for ${member.user.tag}`,
    })
  } catch (err) {
    console.error(`[skz-bot] could not create personal VC:`, err)
    return
  }

  await trackTempChannel(guild.id, created.id, member.id)

  // Move the user in. If this fails (they left, lost perms, etc.), delete
  // the empty channel so we don't leak.
  try {
    await member.voice.setChannel(created.id)
    console.log(
      `[skz-bot] +VC "${name}" (${created.id}) for ${member.user.tag}`,
    )
  } catch (err) {
    console.warn(`[skz-bot] could not move ${member.user.tag} into VC:`, err)
    try {
      await created.delete('move failed')
    } finally {
      await untrackTempChannel(created.id)
    }
  }
}

async function handleLeaveTrackedChannel(oldState: VoiceState) {
  const channel = oldState.channel
  if (!channel) return
  if (channel.type !== ChannelType.GuildVoice) return
  if (channel.members.size > 0) return

  if (!(await isTrackedChannel(channel.id))) return

  try {
    await channel.delete('temp VC empty')
    console.log(`[skz-bot] -VC ${channel.name} (${channel.id}) (empty)`)
  } catch (err) {
    console.warn(`[skz-bot] could not delete empty VC ${channel.id}:`, err)
  } finally {
    await untrackTempChannel(channel.id)
  }
}

export function registerVoiceHub(client: Client) {
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    // User left a channel (oldState had one; newState differs or is null)
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      await handleLeaveTrackedChannel(oldState)
    }
    // User joined the hub VC
    if (newState.channelId && newState.channelId !== oldState.channelId) {
      await handleJoinHub(newState)
    }
  })
}

/**
 * Cleanup pass at startup: delete any tracked VC that is empty (or no
 * longer exists). Without this, a crashed bot would leave orphaned VCs
 * floating in the server forever.
 */
export async function cleanupOrphanedTempChannels(client: Client) {
  const { data, error } = await supabase
    .from('skz_bot_temp_voice_channels')
    .select('guild_id, channel_id')

  if (error) {
    console.warn(`[skz-bot] orphan cleanup query failed: ${error.message}`)
    return
  }
  if (!data?.length) return

  let cleaned = 0
  for (const row of data) {
    try {
      const guild = await client.guilds.fetch(row.guild_id as string)
      const channel = await guild.channels.fetch(row.channel_id as string)
      if (!channel || channel.type !== ChannelType.GuildVoice) {
        await untrackTempChannel(row.channel_id as string)
        cleaned++
        continue
      }
      if (channel.members.size === 0) {
        await channel.delete('startup cleanup: temp VC empty')
        await untrackTempChannel(row.channel_id as string)
        cleaned++
      }
    } catch {
      // Channel/guild no longer accessible — drop the row.
      await untrackTempChannel(row.channel_id as string)
      cleaned++
    }
  }

  if (cleaned > 0) {
    console.log(`[skz-bot] cleaned up ${cleaned} orphaned temp VCs`)
  }
}
