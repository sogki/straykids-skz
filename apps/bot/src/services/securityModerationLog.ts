import {
  type Client,
  EmbedBuilder,
  type GuildMember,
  type Message,
  type TextChannel,
} from 'discord.js'
import { getSupabase } from '../db/supabase.js'
import { memberInfoPayload } from '../utils/memberInfo.js'
import { formatAccountAge } from '../utils/securityGate.js'
import type { ModerationAction } from './securitySettings.js'
import { loadSecuritySettings } from './securitySettings.js'

function truncate(text: string, max = 500) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 3)}...`
}

async function postEmbed(client: Client, channelId: string | null | undefined, embed: EmbedBuilder) {
  if (!channelId) return
  try {
    const ch = await client.channels.fetch(channelId)
    if (!ch?.isTextBased()) return
    await (ch as TextChannel).send({ embeds: [embed] })
  } catch (err) {
    console.warn('[skz-bot] security log channel post failed:', err)
  }
}

async function persistModLogEvent(
  guildId: string,
  eventType: 'account_age_rejected' | 'content_filter_action',
  payload: Record<string, unknown>,
  targetUserId: string,
  channelId?: string | null,
  messageId?: string | null,
) {
  const { error } = await getSupabase().from('skz_bot_mod_log_events').insert({
    guild_id: guildId,
    event_type: eventType,
    channel_id: channelId ?? null,
    target_user_id: targetUserId,
    message_id: messageId ?? null,
    payload,
  })
  if (error) {
    console.warn(`[skz-bot] security mod log persist failed: ${error.message}`)
  }
}

async function persistModerationAction(event: {
  guildId: string
  targetUserId: string
  actionType: 'kick' | 'ban' | 'message_delete'
  reason: string
  matchedRuleId?: string | null
  matchedRuleLabel?: string | null
  channelId?: string | null
  messageId?: string | null
  payload?: Record<string, unknown>
}) {
  const { error } = await getSupabase().from('skz_bot_moderation_actions').insert({
    guild_id: event.guildId,
    target_discord_user_id: event.targetUserId,
    action_type: event.actionType,
    reason: event.reason,
    matched_rule_id: event.matchedRuleId ?? null,
    matched_rule_label: event.matchedRuleLabel ?? null,
    channel_id: event.channelId ?? null,
    message_id: event.messageId ?? null,
    actor_type: 'auto',
    payload: event.payload ?? {},
  })
  if (error) {
    console.warn(`[skz-bot] moderation action persist failed: ${error.message}`)
  }
}

export async function logAccountAgeRejection(
  client: Client,
  member: GuildMember,
  action: ModerationAction,
  actionResult: 'kicked' | 'banned' | 'failed',
) {
  const settings = await loadSecuritySettings()
  const user = member.user
  const reason = `Account too new (${formatAccountAge(user)} old; minimum ${settings.accountAgeMinHours}h)`
  const payload = {
    ...memberInfoPayload(member),
    rejection_reason: reason,
    account_age_hours: Math.floor((Date.now() - user.createdTimestamp) / (60 * 60 * 1000)),
    minimum_hours: settings.accountAgeMinHours,
    action,
    action_result: actionResult,
  }

  await persistModLogEvent(
    member.guild.id,
    'account_age_rejected',
    payload,
    member.id,
  )
  await persistModerationAction({
    guildId: member.guild.id,
    targetUserId: member.id,
    actionType: action,
    reason,
    payload,
  })

  const embed = new EmbedBuilder()
    .setColor(actionResult === 'failed' ? 0xfee75c : 0xed4245)
    .setTitle('Account age gate — rejected')
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'User', value: `${user.tag}\n<@${user.id}>`, inline: true },
      { name: 'Account age', value: formatAccountAge(user), inline: true },
      { name: 'Minimum required', value: `${settings.accountAgeMinHours} hours`, inline: true },
      { name: 'Action', value: `${action} (${actionResult})`, inline: true },
    )
    .setTimestamp()

  await postEmbed(client, settings.accountAgeLogChannelId, embed)
}

export async function logContentFilterAction(
  client: Client,
  message: Message,
  match: { ruleId: string; ruleLabel: string },
  action: ModerationAction,
  actionResult: 'kicked' | 'banned' | 'failed' | 'none',
  messageDeleted: boolean,
) {
  const settings = await loadSecuritySettings()
  const member = message.member
  if (!member) return

  const reason = `Prohibited content: ${match.ruleLabel}`
  const contentSample = truncate(message.content || '[no text]')
  const payload = {
    ...memberInfoPayload(member),
    matched_rule_id: match.ruleId,
    matched_rule_label: match.ruleLabel,
    channel_id: message.channelId,
    message_id: message.id,
    content_sample: contentSample,
    action,
    action_result: actionResult,
    message_deleted: messageDeleted,
  }

  await persistModLogEvent(
    message.guild!.id,
    'content_filter_action',
    payload,
    member.id,
    message.channelId,
    message.id,
  )

  if (messageDeleted) {
    await persistModerationAction({
      guildId: message.guild!.id,
      targetUserId: member.id,
      actionType: 'message_delete',
      reason,
      matchedRuleId: match.ruleId,
      matchedRuleLabel: match.ruleLabel,
      channelId: message.channelId,
      messageId: message.id,
      payload: { content_sample: contentSample },
    })
  }

  if (actionResult === 'kicked' || actionResult === 'banned') {
    await persistModerationAction({
      guildId: message.guild!.id,
      targetUserId: member.id,
      actionType: actionResult === 'banned' ? 'ban' : 'kick',
      reason,
      matchedRuleId: match.ruleId,
      matchedRuleLabel: match.ruleLabel,
      channelId: message.channelId,
      messageId: message.id,
      payload,
    })
  }

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle('Content filter — action taken')
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'User', value: `${member.user.tag}\n<@${member.id}>`, inline: true },
      { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
      { name: 'Matched rule', value: match.ruleLabel, inline: true },
      { name: 'Message deleted', value: messageDeleted ? 'Yes' : 'No', inline: true },
      { name: 'Member action', value: actionResult === 'none' ? 'None' : `${action} (${actionResult})`, inline: true },
      { name: 'Content sample', value: contentSample || '—', inline: false },
    )
    .setTimestamp()

  await postEmbed(client, settings.contentFilterLogChannelId, embed)
}
