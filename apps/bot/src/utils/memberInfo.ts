import { EmbedBuilder, type GuildMember, type User } from 'discord.js'

function formatTimestamp(ms: number | null | undefined) {
  if (!ms) return '—'
  return `<t:${Math.floor(ms / 1000)}:F> (<t:${Math.floor(ms / 1000)}:R>)`
}

export function buildMemberInfoEmbed(
  member: GuildMember,
  title: string,
  extra?: { requestedBy?: GuildMember },
) {
  const user = member.user
  const roles = member.roles.cache
    .filter((r) => r.id !== member.guild.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => r.toString())
    .slice(0, 20)

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'User', value: `${user.tag}\n<@${user.id}>`, inline: true },
      { name: 'Display name', value: member.displayName || '—', inline: true },
      { name: 'User ID', value: `\`${user.id}\``, inline: true },
      {
        name: 'Account created',
        value: formatTimestamp(user.createdTimestamp),
        inline: false,
      },
      {
        name: 'Joined server',
        value: formatTimestamp(member.joinedTimestamp),
        inline: false,
      },
      {
        name: 'Bot account',
        value: user.bot ? 'Yes' : 'No',
        inline: true,
      },
      {
        name: 'Roles',
        value: roles.length ? roles.join(', ') : 'None',
        inline: false,
      },
    )
    .setTimestamp()

  if (extra?.requestedBy) {
    embed.setFooter({
      text: `Requested by ${extra.requestedBy.user.tag}`,
      iconURL: extra.requestedBy.user.displayAvatarURL(),
    })
  }

  return embed
}

export function memberInfoPayload(member: GuildMember, actorUserId?: string) {
  const user = member.user
  return {
    username: user.username,
    tag: user.tag,
    display_name: member.displayName,
    user_id: user.id,
    is_bot: user.bot,
    account_created_at: user.createdAt?.toISOString() ?? null,
    joined_at: member.joinedAt?.toISOString() ?? null,
    avatar_url: user.displayAvatarURL({ size: 256 }),
    role_ids: member.roles.cache
      .filter((r) => r.id !== member.guild.id)
      .map((r) => r.id),
    role_names: member.roles.cache
      .filter((r) => r.id !== member.guild.id)
      .map((r) => r.name),
    actor_user_id: actorUserId ?? null,
  }
}

export async function fetchMemberForInfo(
  guildId: string,
  user: User,
): Promise<GuildMember | null> {
  try {
    const guild = await user.client.guilds.fetch(guildId)
    return await guild.members.fetch(user.id)
  } catch (err) {
    console.warn(`[skz-bot] could not fetch member ${user.id}:`, err)
    return null
  }
}
