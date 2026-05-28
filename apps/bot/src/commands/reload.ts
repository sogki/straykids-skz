import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'
import { reloadBotConfig } from '../db/botConfig.js'
import type { SlashCommand } from './index.js'

export const reloadCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription(
      'Reload the bot\'s settings + reaction roles from the database.',
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    try {
      const config = await reloadBotConfig()
      const rrCount = config.reactionRoles.filter((r) => r.isActive).length
      await interaction.editReply(
        `Reloaded. ${rrCount} active reaction role${rrCount === 1 ? '' : 's'} now in memory.`,
      )
    } catch (err) {
      console.error('[skz-bot] /reload failed:', err)
      await interaction.editReply(
        `Reload failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      )
    }
  },
}
