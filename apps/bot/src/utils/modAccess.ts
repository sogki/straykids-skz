import type { GuildMember } from 'discord.js'
import { getSupabase } from '../db/supabase.js'

export type StaffPermissionLevel = 'full_admin' | 'moderator' | 'member' | 'none'

export type ModAccess = {
  permissionLevel: StaffPermissionLevel
  canViewModLogs: boolean
  canConfigureModLogs: boolean
  canRunModCommands: boolean
}

/** Moderation slash commands: full_admin or moderator mapping only — never member/none. */
export function isModeratorOrAbove(permissionLevel: string): boolean {
  return permissionLevel === 'full_admin' || permissionLevel === 'moderator'
}

export async function resolveModAccess(member: GuildMember): Promise<ModAccess> {
  const roleIds = Array.from(member.roles.cache.keys()).filter(
    (id) => id !== member.guild.id,
  )
  const db = getSupabase()
  const { data: level, error: levelErr } = await db.rpc(
    'skz_admin_permission_for_member',
    {
      p_discord_user_id: member.id,
      p_role_ids: roleIds,
    },
  )
  if (levelErr) {
    console.warn('[skz-bot] mod access level lookup failed:', levelErr.message)
    return {
      permissionLevel: 'none',
      canViewModLogs: false,
      canConfigureModLogs: false,
      canRunModCommands: false,
    }
  }

  const permissionLevel = String(level ?? 'none') as StaffPermissionLevel
  const { data: features, error: featErr } = await db.rpc(
    'skz_admin_bot_features_for_user',
    {
      p_discord_user_id: member.id,
      p_permission_level: permissionLevel,
    },
  )
  if (featErr) {
    console.warn('[skz-bot] mod access features lookup failed:', featErr.message)
  }

  const f = (features ?? {}) as Record<string, boolean>
  const isFullAdmin = permissionLevel === 'full_admin'
  const staffModPlus = isModeratorOrAbove(permissionLevel)

  return {
    permissionLevel,
    canViewModLogs: isFullAdmin || Boolean(f.mod_logs_view),
    canConfigureModLogs: isFullAdmin && f.mod_logs_config !== false,
    canRunModCommands: staffModPlus,
  }
}

export function memberCanRunModCommand(access: ModAccess): boolean {
  return access.canRunModCommands
}
