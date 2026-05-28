import { GuildMember, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { getSupabase } from '../db/supabase.js'
import { getBotConfig } from '../db/botConfig.js'
import type { SlashCommand } from './index.js'

function createLoginCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

export const panelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Get a one-time SKZ admin panel login code (ephemeral).'),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    if (!interaction.guildId || !interaction.member || !('roles' in interaction.member)) {
      await interaction.editReply('Run this inside the target server.')
      return
    }

    const configuredGuildId = getBotConfig().settings.guildId
    if (configuredGuildId && interaction.guildId !== configuredGuildId) {
      await interaction.editReply('This command is only valid in the configured admin guild.')
      return
    }

    const roleIds =
      interaction.member instanceof GuildMember
        ? Array.from(interaction.member.roles.cache.keys()).filter(
            (id) => id !== interaction.guildId,
          )
        : Array.isArray(interaction.member.roles)
          ? interaction.member.roles.filter((id) => id !== interaction.guildId)
          : []
    const db = getSupabase()
    const { data: level, error: levelErr } = await db.rpc('skz_admin_permission_for_member', {
      p_discord_user_id: interaction.user.id,
      p_role_ids: roleIds,
    })
    if (levelErr) {
      await interaction.editReply(`Permission lookup failed: ${levelErr.message}`)
      return
    }
    const permissionLevel = String(level ?? 'none')
    if (!['full_admin', 'moderator'].includes(permissionLevel)) {
      await interaction.editReply(
        'Your account is not authorized for admin access. Ask a full admin to map your Discord role or add your user ID as an owner.',
      )
      return
    }

    const code = createLoginCode(8)
    const { error } = await db.from('skz_admin_discord_login_codes').insert({
      login_code: code,
      discord_user_id: interaction.user.id,
      guild_id: interaction.guildId,
      display_name:
        interaction.member instanceof GuildMember
          ? interaction.member.displayName
          : interaction.user.username,
      permission_level: permissionLevel,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    })
    if (error) {
      await interaction.editReply(`Could not create login code: ${error.message}`)
      return
    }

    await interaction.editReply(
      `Use this code on the admin panel login page within 5 minutes:\n\n**${code}**\n\nPermission: **${permissionLevel}**`,
    )
  },
}
