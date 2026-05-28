import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Partials,
} from 'discord.js'
import { config } from './config.js'
import { commandMap } from './commands/index.js'
import { reloadBotConfig } from './db/botConfig.js'
import { registerReactionRoles } from './handlers/reactionRoles.js'
import {
  cleanupOrphanedTempChannels,
  registerVoiceHub,
} from './handlers/voiceHub.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
  // Partials let us receive reaction events on messages the bot didn't
  // see at startup (i.e. older verify / reaction-role messages).
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
})

registerReactionRoles(client)
registerVoiceHub(client)

client.once(Events.ClientReady, async (ready) => {
  console.log(`[skz-bot] logged in as ${ready.user.tag}`)
  try {
    const cfg = await reloadBotConfig()
    console.log(
      `[skz-bot] config loaded: ${cfg.reactionRoles.filter((r) => r.isActive).length} active reaction roles, verify=${cfg.settings.verifyMessageId ? 'configured' : 'unset'}, join-to-create=${cfg.settings.joinToCreateChannelId ? 'configured' : 'unset'}`,
    )
  } catch (err) {
    console.error(
      '[skz-bot] initial config load failed — bot is online but features are disabled until /reload succeeds.',
      err,
    )
  }
  await cleanupOrphanedTempChannels(client)
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const command = commandMap.get(interaction.commandName)
  if (!command) {
    console.warn(`[skz-bot] no handler for /${interaction.commandName}`)
    return
  }

  try {
    await command.execute(interaction)
  } catch (err) {
    console.error(`[skz-bot] /${interaction.commandName} failed:`, err)
    const errorMessage = 'Something went wrong running that command.'
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: errorMessage,
        flags: MessageFlags.Ephemeral,
      })
    } else {
      await interaction.reply({
        content: errorMessage,
        flags: MessageFlags.Ephemeral,
      })
    }
  }
})

process.on('SIGINT', () => {
  console.log('[skz-bot] shutting down')
  client.destroy()
  process.exit(0)
})

await client.login(config.discord.token)
