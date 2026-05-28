import { config as loadEnv } from 'dotenv'

loadEnv()

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required env var: ${name}. Copy .env.example to .env and fill it in.`,
    )
  }
  return value
}

function optional(name: string): string | undefined {
  const value = process.env[name]
  return value && value.length > 0 ? value : undefined
}

/**
 * Bootstrap config — env-only.
 *
 * Anything operational (guild ID, channel IDs, reaction-role mappings,
 * voice-hub settings) lives in the database and is loaded at runtime via
 * `src/db/botConfig.ts`. Only the four credentials below are required to
 * even reach the database, so they stay here.
 */
export const config = {
  discord: {
    token: required('DISCORD_TOKEN'),
    clientId: required('DISCORD_CLIENT_ID'),
    /** When set, slash commands register to this guild only (instant updates). */
    devGuildId: optional('DISCORD_GUILD_ID'),
  },
  supabase: {
    url: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },
} as const

export type AppConfig = typeof config
