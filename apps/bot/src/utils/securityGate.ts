import type { GuildMember, User } from 'discord.js'
import {
  accountAgeMinMs,
  type ModerationAction,
  type SecuritySettings,
} from '../services/securitySettings.js'
import { isModeratorOrAbove, resolveModAccess } from './modAccess.js'

export function accountAgeMs(user: User): number {
  return Date.now() - user.createdTimestamp
}

export function isAccountTooYoung(user: User, settings: SecuritySettings): boolean {
  return accountAgeMs(user) < accountAgeMinMs(settings)
}

export async function shouldBypassSecurity(member: GuildMember): Promise<boolean> {
  if (member.user.bot) return true
  const access = await resolveModAccess(member)
  return isModeratorOrAbove(access.permissionLevel)
}

export function formatAccountAge(user: User): string {
  const hours = Math.floor(accountAgeMs(user) / (60 * 60 * 1000))
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(accountAgeMs(user) / (60 * 1000)))
    return `${mins} minute${mins === 1 ? '' : 's'}`
  }
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}

/** Returns a user-facing message when verify should be blocked, or null if allowed. */
export async function verifyBlockedByAccountAge(
  member: GuildMember,
  settings: SecuritySettings,
): Promise<string | null> {
  if (!settings.accountAgeGateEnabled) return null
  if (settings.guildId && member.guild.id !== settings.guildId) return null
  if (await shouldBypassSecurity(member)) return null
  if (!isAccountTooYoung(member.user, settings)) return null
  return `Your Discord account must be at least ${settings.accountAgeMinHours} hours old before you can verify.`
}

export async function applyModerationAction(
  member: GuildMember,
  action: ModerationAction,
  reason: string,
): Promise<'kicked' | 'banned' | 'failed'> {
  try {
    if (action === 'ban') {
      if (!member.bannable) return 'failed'
      await member.ban({ reason, deleteMessageSeconds: 60 * 60 })
      return 'banned'
    }
    if (member.kickable) {
      await member.kick(reason)
      return 'kicked'
    }
    return 'failed'
  } catch (err) {
    console.warn(`[skz-bot] moderation action (${action}) failed for ${member.id}:`, err)
    return 'failed'
  }
}
