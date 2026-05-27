/**
 * Registers slash commands with Discord.
 *
 *   - With DISCORD_GUILD_ID set, commands update instantly in that guild
 *     (use this during development).
 *   - Without DISCORD_GUILD_ID, commands register globally and can take up
 *     to an hour to propagate on first deploy.
 *
 * Run with: `npm run register --workspace=@skz/bot`
 */
import { REST, Routes } from 'discord.js'
import { config } from '../config.js'
import { commands } from '../commands/index.js'

const rest = new REST({ version: '10' }).setToken(config.discord.token)
const body = commands.map((c) =>
  'toJSON' in c.data ? (c.data as { toJSON: () => unknown }).toJSON() : c.data,
)

async function main() {
  const route = config.discord.devGuildId
    ? Routes.applicationGuildCommands(
        config.discord.clientId,
        config.discord.devGuildId,
      )
    : Routes.applicationCommands(config.discord.clientId)

  console.log(
    `[skz-bot] registering ${commands.length} command${commands.length === 1 ? '' : 's'} to ${
      config.discord.devGuildId
        ? `guild ${config.discord.devGuildId}`
        : 'globally'
    }`,
  )

  await rest.put(route, { body })
  console.log('[skz-bot] done.')
}

main().catch((err) => {
  console.error('[skz-bot] command registration failed:', err)
  process.exit(1)
})
