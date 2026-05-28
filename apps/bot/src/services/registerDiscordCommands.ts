import { REST, Routes } from 'discord.js'
import { globalCommands, guildCommands } from '../commands/index.js'
import { reloadBotConfig } from '../db/botConfig.js'
import { loadCredentialsFromDb } from '../db/credentials.js'

function commandNames(list: typeof guildCommands) {
  return list.map((c) => {
    const data = c.data as { name?: string }
    return typeof data.name === 'string' ? data.name : 'unknown'
  })
}

function toJsonBody(list: typeof guildCommands) {
  return list.map((c) =>
    'toJSON' in c.data ? (c.data as { toJSON: () => unknown }).toJSON() : c.data,
  )
}

export type RegisterCommandsResult = {
  global: string[]
  guild: string[] | null
  guildId: string | null
}

/**
 * Pushes slash commands to the configured guild and clears global commands.
 * Safe to call on startup and /reload.
 */
export async function registerDiscordCommands(): Promise<RegisterCommandsResult> {
  const creds = await loadCredentialsFromDb()
  const config = await reloadBotConfig()

  if (!creds.discordClientId) {
    throw new Error(
      'discord_client_id is not set in bot settings. Add it in Admin → Discord bot → Credentials.',
    )
  }

  const guildId = config.settings.guildId?.trim() || null
  const rest = new REST({ version: '10' }).setToken(creds.discordToken)

  // Remove any previously registered global commands (e.g. old leaderboard/profile).
  await rest.put(Routes.applicationCommands(creds.discordClientId), {
    body: toJsonBody(globalCommands),
  })

  if (!guildId) {
    throw new Error(
      'guild_id is not set in bot settings. Set your Stay Café server ID in Admin → Discord bot → Server.',
    )
  }

  await rest.put(Routes.applicationGuildCommands(creds.discordClientId, guildId), {
    body: toJsonBody(guildCommands),
  })

  return {
    global: commandNames(globalCommands),
    guild: commandNames(guildCommands),
    guildId,
  }
}
