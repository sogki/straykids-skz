import type { GuildMember } from 'discord.js'
import type { BotMessageRow } from '../db/botConfig.js'

export type FeedbackKey = 'added' | 'removed' | 'already' | 'error'

const VERIFY_FEEDBACK: Record<FeedbackKey, string> = {
  added: "Welcome to **{server}**, {username}! You're now verified.",
  removed: '',
  already: "You're already verified.",
  error: 'Could not verify you. Ask a mod to check my permissions and role hierarchy.',
}

const ROLE_FEEDBACK: Record<FeedbackKey, string> = {
  added: 'Added **{role}**.',
  removed: 'Removed **{role}**.',
  already: 'You already have **{role}**.',
  error: 'Could not update your role. Check bot permissions and role hierarchy.',
}

function panelDefaults(panel: BotMessageRow | undefined): Record<FeedbackKey, string> {
  return panel?.kind === 'verify' ? VERIFY_FEEDBACK : ROLE_FEEDBACK
}

function feedbackTemplate(
  panel: BotMessageRow | undefined,
  key: FeedbackKey,
): string {
  const embed = panel?.embed as
    | { panel_options?: { feedback?: Partial<Record<FeedbackKey, string>> } }
    | undefined
  const custom = embed?.panel_options?.feedback?.[key]
  if (typeof custom === 'string' && custom.trim()) return custom.trim()
  return panelDefaults(panel)[key]
}

function resolveFeedbackText(
  template: string,
  member: GuildMember,
  roleName: string,
): string {
  const guild = member.guild
  return template
    .replaceAll('{username}', member.user.username)
    .replaceAll('{displayname}', member.displayName || member.user.username)
    .replaceAll('{mention}', `<@${member.user.id}>`)
    .replaceAll('{server}', guild.name)
    .replaceAll(
      '{member_count}',
      guild.memberCount != null ? String(guild.memberCount) : '0',
    )
    .replaceAll('{role}', roleName)
}

export function resolvePanelFeedback(
  panel: BotMessageRow | undefined,
  key: FeedbackKey,
  member: GuildMember,
  roleName: string,
): string {
  return resolveFeedbackText(feedbackTemplate(panel, key), member, roleName)
}
