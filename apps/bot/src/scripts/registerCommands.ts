/**
 * Registers slash commands with Discord (CLI).
 *
 * Guild-only: panel, reload, info, leaderboard, profile (Stay Café server).
 *
 * Run: npm run register --workspace=@skz/bot
 * (Also runs automatically on bot startup and /reload.)
 */
import { config as loadEnv } from 'dotenv'
import { bootstrapSupabaseFromDb } from '../db/supabase.js'
import { registerDiscordCommands } from '../services/registerDiscordCommands.js'

loadEnv()

async function main() {
  await bootstrapSupabaseFromDb()
  const result = await registerDiscordCommands()

  console.log('[skz-bot] cleared global slash commands (this bot is guild-only).')
  console.log(
    `[skz-bot] registered ${result.guild?.length ?? 0} guild command(s) to ${result.guildId}: ${result.guild?.join(', ')}`,
  )

  console.log('[skz-bot] done.')
}

main().catch((err) => {
  console.error('[skz-bot] command registration failed:', err)
  process.exit(1)
})
