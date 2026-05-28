import type { GuildMember, PartialGuildMember } from 'discord.js'

/** Member on join (full) or leave (may be partial). */
export type GreetingMember = GuildMember | PartialGuildMember

function roleMentionsForGreetingMember(member: GreetingMember): string {
  if (!('roles' in member) || !member.roles || !('cache' in member.roles)) {
    return 'None'
  }
  const mentions = member.roles.cache
    .filter((r) => r.id !== member.guild.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => r.toString())
    .slice(0, 20)
  return mentions.length ? mentions.join(', ') : 'None'
}

export function discordTimestamp(ms: number | null | undefined) {
  if (!ms) return '—'
  return `<t:${Math.floor(ms / 1000)}:F> (<t:${Math.floor(ms / 1000)}:R>)`
}

export function memberLogContext(
  member: GuildMember,
  eventTitle: string,
  requestedBy?: GuildMember,
) {
  const user = member.user
  const roles = member.roles.cache
    .filter((r) => r.id !== member.guild.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => r.toString())
    .slice(0, 20)

  return {
    username: user.username,
    displayname: member.displayName || user.username,
    mention: `<@${user.id}>`,
    tag: user.tag,
    user_id: user.id,
    server: member.guild.name,
    member_count:
      member.guild.memberCount != null ? String(member.guild.memberCount) : '0',
    account_created: discordTimestamp(user.createdTimestamp),
    joined_at: discordTimestamp(member.joinedTimestamp),
    is_bot: user.bot ? 'Yes' : 'No',
    roles: roles.length ? roles.join(', ') : 'None',
    avatar_url: user.displayAvatarURL({ size: 256 }),
    event_title: eventTitle,
    requested_by: requestedBy?.user.tag ?? '',
  }
}

export function channelMention(id: string | null | undefined) {
  return id ? `<#${id}>` : '—'
}

/** Context for welcome / goodbye embeds. */
export function memberGreetingContext(
  member: GreetingMember,
  eventTitle: string,
  options?: { includeLeftAt?: boolean },
) {
  const user = member.user
  const ctx = {
    username: user.username,
    displayname: member.displayName || user.username,
    mention: `<@${user.id}>`,
    tag: user.tag,
    user_id: user.id,
    server: member.guild.name,
    member_count:
      member.guild.memberCount != null ? String(member.guild.memberCount) : '0',
    account_created: discordTimestamp(user.createdTimestamp),
    joined_at: discordTimestamp(member.joinedTimestamp ?? null),
    is_bot: user.bot ? 'Yes' : 'No',
    roles: roleMentionsForGreetingMember(member),
    avatar_url: user.displayAvatarURL({ size: 256 }),
    event_title: eventTitle,
    left_at: '—' as string,
  }
  if (options?.includeLeftAt) {
    ctx.left_at = discordTimestamp(Date.now())
  }
  return ctx
}
