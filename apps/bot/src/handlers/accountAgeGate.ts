import { Events, type Client } from 'discord.js'
import { loadSecuritySettings } from '../services/securitySettings.js'
import { logAccountAgeRejection } from '../services/securityModerationLog.js'
import {
  applyModerationAction,
  isAccountTooYoung,
  shouldBypassSecurity,
} from '../utils/securityGate.js'

export async function enforceAccountAgeOnMember(
  client: Client,
  member: import('discord.js').GuildMember,
): Promise<'allowed' | 'rejected' | 'skipped'> {
  if (member.user.bot) return 'skipped'

  const settings = await loadSecuritySettings()
  if (!settings.accountAgeGateEnabled) return 'skipped'
  if (settings.guildId && member.guild.id !== settings.guildId) return 'skipped'
  if (await shouldBypassSecurity(member)) {
    return 'allowed'
  }

  if (!isAccountTooYoung(member.user, settings)) return 'allowed'

  const reason = `Account must be at least ${settings.accountAgeMinHours} hours old`
  const result = await applyModerationAction(member, settings.accountAgeAction, reason)
  await logAccountAgeRejection(client, member, settings.accountAgeAction, result)
  return 'rejected'
}

export function registerAccountAgeGate(client: Client) {
  client.on(Events.GuildMemberAdd, (member) => {
    enforceAccountAgeOnMember(client, member).catch((err) =>
      console.warn('[skz-bot] account age gate failed:', err),
    )
  })
}
