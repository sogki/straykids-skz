import type { Client } from 'discord.js'
import { loadCredentialsFromDb } from './db/credentials.js'

let activeToken: string | null = null

/**
 * Log in using discord_token from skz_bot_settings — never from .env.
 */
export async function loginFromDatabase(client: Client): Promise<void> {
  const creds = await loadCredentialsFromDb()
  console.log('[skz-bot] using discord_token from skz_bot_settings (database)')
  activeToken = creds.discordToken
  await client.login(creds.discordToken)
}

/**
 * Re-read credentials from DB. Reconnects when the token changed in admin.
 * Returns true when a reconnect happened.
 */
export async function refreshDiscordSession(client: Client): Promise<boolean> {
  const creds = await loadCredentialsFromDb()

  if (creds.discordToken === activeToken && client.isReady()) {
    return false
  }

  console.log('[skz-bot] discord_token updated in database — reconnecting…')
  if (client.isReady()) {
    await client.destroy()
  }

  activeToken = creds.discordToken
  await client.login(creds.discordToken)
  return true
}

export function getActiveTokenFingerprint(): string | null {
  if (!activeToken) return null
  return `${activeToken.slice(0, 8)}…${activeToken.slice(-4)}`
}
