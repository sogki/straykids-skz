import { config as loadEnv } from 'dotenv'

loadEnv()

/**
 * Optional bootstrap credentials — used ONLY on first connect when the DB
 * row is empty. Once `supabase_url` + `supabase_service_role_key` are set
 * in skz_bot_settings (via the admin panel), the bot reads them from there
 * on every /reload and reconnects without touching .env.
 *
 * Discord token + client ID also live in the DB. No Discord secrets in .env.
 */
export const bootstrap = {
  supabaseUrl: optional('SUPABASE_URL'),
  supabaseServiceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),
} as const

function optional(name: string): string | undefined {
  const value = process.env[name]
  return value && value.length > 0 ? value : undefined
}
