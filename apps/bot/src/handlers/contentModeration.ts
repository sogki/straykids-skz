import { Events, type Client, type Message } from 'discord.js'
import { loadSecuritySettings } from '../services/securitySettings.js'
import { logContentFilterAction } from '../services/securityModerationLog.js'
import { matchProhibitedContent } from '../utils/contentMatcher.js'
import {
  applyModerationAction,
  shouldBypassSecurity,
} from '../utils/securityGate.js'

async function handleProhibitedMessage(client: Client, message: Message) {
  if (message.author.bot) return
  if (!message.guild) return
  if (!message.content?.trim()) return

  const settings = await loadSecuritySettings()
  if (!settings.contentFilterEnabled) return
  if (settings.guildId && message.guild.id !== settings.guildId) return
  if (settings.contentFilterExemptChannelIds.includes(message.channelId)) return

  let member = message.member
  if (!member) {
    try {
      member = await message.guild.members.fetch(message.author.id)
    } catch {
      console.warn(
        `[skz-bot] content filter: could not resolve member ${message.author.id}`,
      )
      return
    }
  }
  if (await shouldBypassSecurity(member)) return

  const match = matchProhibitedContent(message.content, settings.contentFilterPatterns)
  if (!match) return

  let messageDeleted = false
  try {
    await message.delete()
    messageDeleted = true
  } catch (err) {
    console.warn('[skz-bot] content filter message delete failed:', err)
  }

  const reason = `Prohibited content: ${match.ruleLabel}`
  let actionResult: 'kicked' | 'banned' | 'failed' | 'none' = 'none'
  if (settings.contentFilterAction === 'ban' || settings.contentFilterAction === 'kick') {
    actionResult = await applyModerationAction(member, settings.contentFilterAction, reason)
  }

  await logContentFilterAction(
    client,
    message,
    match,
    settings.contentFilterAction,
    actionResult,
    messageDeleted,
  )

  console.log(
    `[skz-bot] content filter: ${match.ruleId} → user ${message.author.id} (${actionResult})`,
  )
}

export function registerContentModeration(client: Client) {
  client.on(Events.MessageCreate, (message) => {
    handleProhibitedMessage(client, message).catch((err) =>
      console.warn('[skz-bot] content moderation failed:', err),
    )
  })
}
