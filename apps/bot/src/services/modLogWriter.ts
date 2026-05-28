import {
  type Client,
  type Guild,
  type GuildMember,
  type Message,
  type PartialMessage,
  type TextChannel,
} from 'discord.js'
import { getSupabase } from '../db/supabase.js'
import { buildModLogEmbed } from '../utils/modLogEmbed.js'
import { channelMention, memberLogContext } from '../utils/modLogContext.js'
import { memberInfoPayload } from '../utils/memberInfo.js'
import { loadModLogSettings, type ModLogSettings } from './modLogSettings.js'

export type ModLogEventType =
  | 'member_join'
  | 'member_info'
  | 'message_delete'
  | 'message_edit'
  | 'message_bulk_delete'

function truncate(text: string, max = 1000) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 3)}...`
}

function channelNameForGuild(guild: Guild | null | undefined, channelId: string) {
  if (!guild) return null
  const ch = guild.channels.cache.get(channelId)
  return ch && 'name' in ch ? (ch.name as string) : null
}

async function persistEvent(
  settings: ModLogSettings,
  event: {
    eventType: ModLogEventType
    channelId?: string | null
    actorUserId?: string | null
    targetUserId?: string | null
    messageId?: string | null
    payload: Record<string, unknown>
  },
) {
  if (!settings.guildId) return
  const { error } = await getSupabase().from('skz_bot_mod_log_events').insert({
    guild_id: settings.guildId,
    event_type: event.eventType,
    channel_id: event.channelId ?? null,
    actor_user_id: event.actorUserId ?? null,
    target_user_id: event.targetUserId ?? null,
    message_id: event.messageId ?? null,
    payload: event.payload,
  })
  if (error) {
    console.warn(`[skz-bot] mod log persist failed: ${error.message}`)
  }
}

async function postToChannel(
  client: Client,
  channelId: string | null | undefined,
  embed: ReturnType<typeof buildModLogEmbed>,
) {
  if (!channelId) return
  try {
    const ch = await client.channels.fetch(channelId)
    if (!ch?.isTextBased()) return
    await (ch as TextChannel).send({ embeds: [embed] })
  } catch (err) {
    console.warn(`[skz-bot] mod log channel post failed:`, err)
  }
}

export async function logMemberJoin(client: Client, member: GuildMember) {
  const settings = await loadModLogSettings()
  if (!settings.enabled || !settings.logMemberJoin) return
  if (settings.guildId && member.guild.id !== settings.guildId) return
  if (member.user.bot) return

  const ctx = memberLogContext(member, 'Member joined')
  const embed = buildModLogEmbed(settings.embedTemplates, 'member', ctx)
  const payload = memberInfoPayload(member)

  await persistEvent(settings, {
    eventType: 'member_join',
    targetUserId: member.id,
    payload,
  })
  await postToChannel(client, settings.joinChannelId, embed)
}

export async function logMemberInfo(
  client: Client,
  member: GuildMember,
  requestedBy: GuildMember,
) {
  const settings = await loadModLogSettings()
  if (!settings.enabled) return
  if (settings.guildId && member.guild.id !== settings.guildId) return

  const ctx = memberLogContext(member, 'Account lookup', requestedBy)
  const embed = buildModLogEmbed(settings.embedTemplates, 'member', ctx)
  const payload = memberInfoPayload(member, requestedBy)

  await persistEvent(settings, {
    eventType: 'member_info',
    actorUserId: requestedBy.id,
    targetUserId: member.id,
    payload,
  })
  await postToChannel(client, settings.joinChannelId, embed)
}

/** Build the member embed for ephemeral /info (same template as channel logs). */
export async function buildMemberInfoEmbedForCommand(
  member: GuildMember,
  eventTitle: string,
  requestedBy?: GuildMember,
) {
  const settings = await loadModLogSettings()
  const ctx = memberLogContext(member, eventTitle, requestedBy)
  return buildModLogEmbed(settings.embedTemplates, 'member', ctx)
}

function messageContent(msg: Message | PartialMessage) {
  const content = msg.content?.trim()
  if (content) return content
  if (msg.embeds?.length) return `[${msg.embeds.length} embed(s)]`
  if (msg.attachments?.size) return `[${msg.attachments.size} attachment(s)]`
  return '*No text content (may require Message Content intent)*'
}

export async function logMessageDelete(
  client: Client,
  message: Message | PartialMessage,
) {
  const settings = await loadModLogSettings()
  if (!settings.enabled || !settings.logMessageDeletes) return
  const guild = message.guild
  if (!guild) return
  if (settings.guildId && guild.id !== settings.guildId) return
  if (message.author?.bot) return

  const content = truncate(messageContent(message))
  const ctx = {
    author: message.author?.tag ?? 'Unknown',
    author_mention: message.author ? `<@${message.author.id}>` : 'Unknown',
    author_tag: message.author?.tag ?? 'Unknown',
    channel: channelMention(message.channelId),
    message_id: message.id,
    content: content || '—',
    event_title: 'Message deleted',
  }
  const embed = buildModLogEmbed(settings.embedTemplates, 'message_delete', ctx)

  const payload = {
    author_id: message.author?.id ?? null,
    author_tag: message.author?.tag ?? null,
    channel_id: message.channelId,
    channel_name: channelNameForGuild(guild, message.channelId),
    content,
  }

  await persistEvent(settings, {
    eventType: 'message_delete',
    channelId: message.channelId,
    actorUserId: message.author?.id ?? null,
    messageId: message.id,
    payload,
  })
  await postToChannel(client, settings.messageChannelId, embed)
}

export async function logMessageEdit(
  client: Client,
  oldMessage: Message | PartialMessage,
  newMessage: Message | PartialMessage,
) {
  const settings = await loadModLogSettings()
  if (!settings.enabled || !settings.logMessageEdits) return
  const guild = newMessage.guild ?? oldMessage.guild
  if (!guild) return
  if (settings.guildId && guild.id !== settings.guildId) return
  if (newMessage.author?.bot) return

  const before = truncate(messageContent(oldMessage))
  const after = truncate(messageContent(newMessage))
  if (before === after) return

  const ctx = {
    author: newMessage.author?.tag ?? 'Unknown',
    author_mention: newMessage.author ? `<@${newMessage.author.id}>` : 'Unknown',
    author_tag: newMessage.author?.tag ?? 'Unknown',
    channel: channelMention(newMessage.channelId),
    message_id: newMessage.id,
    before: before || '—',
    after: after || '—',
    url: newMessage.url ?? '',
    event_title: 'Message edited',
  }
  const embed = buildModLogEmbed(settings.embedTemplates, 'message_edit', ctx)

  const payload = {
    author_id: newMessage.author?.id ?? null,
    author_tag: newMessage.author?.tag ?? null,
    channel_id: newMessage.channelId,
    before,
    after,
    url: newMessage.url ?? null,
  }

  await persistEvent(settings, {
    eventType: 'message_edit',
    channelId: newMessage.channelId,
    actorUserId: newMessage.author?.id ?? null,
    messageId: newMessage.id,
    payload,
  })
  await postToChannel(client, settings.messageChannelId, embed)
}

export async function logMessageBulkDelete(
  client: Client,
  messages: Iterable<Message | PartialMessage>,
  channelId: string,
  guildId: string,
) {
  const settings = await loadModLogSettings()
  if (!settings.enabled || !settings.logMessageBulkDeletes) return
  if (settings.guildId && guildId !== settings.guildId) return

  const list = [...messages].filter((m) => !m.author?.bot)
  if (!list.length) return

  const samples = list.slice(0, 5).map((m) => {
    const author = m.author?.tag ?? 'Unknown'
    return `• **${author}**: ${truncate(messageContent(m), 200)}`
  })

  const ctx = {
    channel: channelMention(channelId),
    count: String(list.length),
    samples: truncate(samples.join('\n'), 1000) || '—',
    event_title: 'Bulk message delete',
  }
  const embed = buildModLogEmbed(settings.embedTemplates, 'message_bulk_delete', ctx)

  let guild: Guild | null = null
  try {
    guild = await client.guilds.fetch(guildId)
  } catch {
    guild = null
  }

  const payload = {
    channel_id: channelId,
    channel_name: channelNameForGuild(guild, channelId),
    count: list.length,
    message_ids: list.map((m) => m.id),
    samples: list.slice(0, 10).map((m) => ({
      id: m.id,
      author_id: m.author?.id ?? null,
      author_tag: m.author?.tag ?? null,
      content: messageContent(m),
    })),
  }

  await persistEvent(settings, {
    eventType: 'message_bulk_delete',
    channelId,
    payload,
  })
  await postToChannel(client, settings.messageChannelId, embed)
}
