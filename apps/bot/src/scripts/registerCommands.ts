/**
 * Registers slash commands with Discord.
 *
 * Reads discord_client_id, discord_token, and guild_id from skz_bot_settings.
 *
 * Run: npm run register --workspace=@skz/bot
 */
import { REST, Routes } from 'discord.js'
import { config as loadEnv } from 'dotenv'
import { loadCredentialsFromDb } from '../db/credentials.js'
import { reloadBotConfig } from '../db/botConfig.js'
import { bootstrapSupabaseFromDb } from '../db/supabase.js'
import { commands } from '../commands/index.js'

loadEnv()

async function main() {
  await bootstrapSupabaseFromDb()
  const creds = await loadCredentialsFromDb()
  const config = await reloadBotConfig()

  if (!creds.discordClientId) {
    throw new Error(
      'discord_client_id is not set in skz_bot_settings. Add it in Admin → Discord bot.',
    )
  }

  const guildId = config.settings.guildId?.trim()

  const rest = new REST({ version: '10' }).setToken(creds.discordToken)
  const body = commands.map((c) =>
    'toJSON' in c.data ? (c.data as { toJSON: () => unknown }).toJSON() : c.data,
  )

  const route = guildId
    ? Routes.applicationGuildCommands(creds.discordClientId, guildId)
    : Routes.applicationCommands(creds.discordClientId)

  console.log(
    `[skz-bot] registering ${commands.length} command(s) ${
      guildId ? `to guild ${guildId} (from skz_bot_settings)` : 'globally'
    }`,
  )

  await rest.put(route, { body })
  console.log('[skz-bot] done.')
}

main().catch((err) => {
  console.error('[skz-bot] command registration failed:', err)
  process.exit(1)
})
