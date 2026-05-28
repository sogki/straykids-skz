import {
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js'
import { fetchMemberForInfo } from '../utils/memberInfo.js'
import { memberCanRunModCommand, resolveModAccess } from '../utils/modAccess.js'
import {
  buildMemberInfoEmbedForCommand,
  logMemberInfo,
} from '../services/modLogWriter.js'
import type { SlashCommand } from './index.js'

// addUserOption narrows the builder type; cast matches other slash commands.

const infoData = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Look up detailed account information for a member (moderators).')
  .addUserOption((opt) =>
    opt
      .setName('user')
      .setDescription('Member to look up (defaults to you)')
      .setRequired(false),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

export const infoCommand: SlashCommand = {
  data: infoData as SlashCommandBuilder,
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    if (!interaction.guildId || !interaction.guild) {
      await interaction.editReply('Run this command inside the server.')
      return
    }

    const actor =
      interaction.member instanceof GuildMember
        ? interaction.member
        : interaction.guild.members.cache.get(interaction.user.id) ??
          (await interaction.guild.members.fetch(interaction.user.id).catch(() => null))

    if (!actor) {
      await interaction.editReply('Could not resolve your member record.')
      return
    }

    const access = await resolveModAccess(actor)
    if (!memberCanRunModCommand(access)) {
      await interaction.editReply(
        access.permissionLevel === 'member'
          ? 'This command is for staff with a **moderator** or **full admin** role mapping in the admin panel — **member** roles cannot use moderation commands.'
          : 'You are not authorized to use moderation commands. Ask a full admin to map your Discord role to **moderator** or **full admin** under Role permissions.',
      )
      return
    }

    const targetUser = interaction.options.getUser('user') ?? interaction.user
    const targetMember =
      interaction.options.getMember('user') instanceof GuildMember
        ? (interaction.options.getMember('user') as GuildMember)
        : await fetchMemberForInfo(interaction.guildId, targetUser)

    if (!targetMember) {
      await interaction.editReply('Could not find that member in this server.')
      return
    }

    const embed = await buildMemberInfoEmbedForCommand(
      targetMember,
      'Account lookup',
      actor,
    )
    await interaction.editReply({ embeds: [embed] })

    await logMemberInfo(interaction.client, targetMember, actor).catch((err) =>
      console.warn('[skz-bot] /info mod log failed:', err),
    )
  },
}
