import type { Guild, GuildMember } from 'discord.js'

export type RoleChangeResult = 'added' | 'removed' | 'unchanged' | 'failed'

export function roleDisplayName(
  guild: Guild | null | undefined,
  roleId: string,
  fallback: string,
): string {
  return guild?.roles.cache.get(roleId)?.name ?? fallback ?? 'role'
}

export async function applyReactionRoleChange(
  member: GuildMember,
  roleId: string,
  label: string,
  action: 'add' | 'remove',
): Promise<RoleChangeResult> {
  try {
    if (action === 'add') {
      if (member.roles.cache.has(roleId)) return 'unchanged'
      await member.roles.add(roleId, `reaction-role: ${label}`)
      return 'added'
    }
    if (!member.roles.cache.has(roleId)) return 'unchanged'
    await member.roles.remove(roleId, `reaction-role removed: ${label}`)
    return 'removed'
  } catch (err) {
    console.error(`[skz-bot] could not ${action} role ${roleId} on ${member.id}:`, err)
    return 'failed'
  }
}
