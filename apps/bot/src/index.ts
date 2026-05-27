import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js'
import { config } from './config.js'
import { commandMap } from './commands/index.js'

const client = new Client({
  // Slash commands don't need privileged intents. Add more here if/when the
  // bot needs to listen to messages, voice, etc.
  intents: [GatewayIntentBits.Guilds],
})

client.once(Events.ClientReady, (ready) => {
  console.log(`[skz-bot] logged in as ${ready.user.tag}`)
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
