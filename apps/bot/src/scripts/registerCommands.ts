/**
 * Registers slash commands with Discord.
 *
 * Guild commands: panel, reload, info (configured guild_id).
 * Global commands: link (player arcade auth — works in DMs, any server).
 *
 * Run: npm run register --workspace=@skz/bot
 */
import { REST, Routes } from 'discord.js'
import { config as loadEnv } from 'dotenv'
import { loadCredentialsFromDb } from '../db/credentials.js'
import { reloadBotConfig } from '../db/botConfig.js'
import { bootstrapSupabaseFromDb } from '../db/supabase.js'
import { globalCommands, guildCommands } from '../commands/index.js'

loadEnv()

function toJsonBody(list: typeof guildCommands) {
  return list.map((c) =>
    'toJSON' in c.data ? (c.data as { toJSON: () => unknown }).toJSON() : c.data,
  )
}

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

  await rest.put(Routes.applicationCommands(creds.discordClientId), {
    body: toJsonBody(globalCommands),
  })
  console.log(
    `[skz-bot] registered ${globalCommands.length} global command(s): ${globalCommands.map((c) => (c.data as { name: string }).name).join(', ')}`,
  )

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(creds.discordClientId, guildId), {
      body: toJsonBody(guildCommands),
    })
    console.log(
      `[skz-bot] registered ${guildCommands.length} guild command(s) to ${guildId}: ${guildCommands.map((c) => (c.data as { name: string }).name).join(', ')}`,
    )
  } else {
    console.warn(
      '[skz-bot] guild_id not set — staff commands (panel, reload, info) were not registered. Set guild_id in bot settings.',
    )
  }

  console.log('[skz-bot] done.')
}

main().catch((err) => {
  console.error('[skz-bot] command registration failed:', err)
  process.exit(1)
})
