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

export const config = {
  discord: {
    token: required('DISCORD_TOKEN'),
    clientId: required('DISCORD_CLIENT_ID'),
    /** When set, slash commands register to this guild only (instant). */
    devGuildId: optional('DISCORD_GUILD_ID'),
  },
  supabase: {
    url: optional('SUPABASE_URL'),
    serviceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),
  },
} as const

export type AppConfig = typeof config
