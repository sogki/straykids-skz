/**
 * Registers slash commands with Discord (CLI).
 *
 * Guild: panel, reload, info. Global: leaderboard, profile.
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

  console.log(
    `[skz-bot] registered ${result.global.length} global command(s): ${result.global.join(', ')}`,
  )

  if (result.guild && result.guildId) {
    console.log(
      `[skz-bot] registered ${result.guild.length} guild command(s) to ${result.guildId}: ${result.guild.join(', ')}`,
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
