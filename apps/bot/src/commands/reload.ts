import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'
import { reloadBotConfig } from '../db/botConfig.js'
import { loadCredentialsFromDb } from '../db/credentials.js'
import { refreshDiscordSession } from '../discordSession.js'
import { processOutbox } from '../services/outboxWorker.js'
import { syncDiscordCache } from '../services/syncDiscordCache.js'
import { invalidateModLogSettingsCache } from '../services/modLogSettings.js'
import { clearPlayerAuthConfigCache } from '../http/playerAuthConfig.js'
import type { SlashCommand } from './index.js'

export const reloadCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription(
      'Reload settings from the database, sync Discord dropdowns, and process pending deploys.',
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    try {
      await loadCredentialsFromDb()
      clearPlayerAuthConfigCache()
      const reconnected = await refreshDiscordSession(interaction.client)
      invalidateModLogSettingsCache()
      const config = await reloadBotConfig()
      const synced = await syncDiscordCache(interaction.client)
      const outbox = await processOutbox(interaction.client)
      const rrCount = config.reactionRoles.filter((r) => r.isActive).length
      const reconnectNote = reconnected ? ' Reconnected with new token from DB.' : ''
      await interaction.editReply(
        `Reloaded from skz_bot_settings.${reconnectNote} ${rrCount} active reaction role${rrCount === 1 ? '' : 's'}, ${synced} Discord entities cached, ${outbox} outbox job${outbox === 1 ? '' : 's'} processed.`,
      )
    } catch (err) {
      console.error('[skz-bot] /reload failed:', err)
      await interaction.editReply(
        `Reload failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      )
    }
  },
}
