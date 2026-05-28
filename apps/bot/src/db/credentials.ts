import { getSupabase, initSupabase } from './supabase.js'

export interface BotCredentials {
  discordToken: string
  discordClientId: string
  supabaseUrl: string
  supabaseServiceRoleKey: string
}

const PLACEHOLDER_VALUES = new Set(['__SECRET_SET__', 'undefined', 'null'])

/** Discord bot tokens are never read from process.env — only skz_bot_settings. */
export async function loadCredentialsFromDb(): Promise<BotCredentials> {
  const { data, error } = await getSupabase()
    .from('skz_bot_settings')
    .select('key, value')
    .in('key', [
      'discord_token',
      'discord_client_id',
      'supabase_url',
      'supabase_service_role_key',
    ])

  if (error) throw new Error(`Failed to load credentials: ${error.message}`)

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    map[row.key as string] = String(row.value ?? '').trim()
  }

  const discordToken = normalizeDiscordToken(map['discord_token'])
  const discordClientId = map['discord_client_id'] ?? ''
  const supabaseUrl = map['supabase_url'] ?? ''
  const supabaseServiceRoleKey = map['supabase_service_role_key'] ?? ''

  if (!discordToken) {
    throw new Error(
      'discord_token is missing in skz_bot_settings. Open Admin → Discord bot → Credentials, paste your bot token, and Save settings.',
    )
  }

  if (!isPlausibleDiscordToken(discordToken)) {
    throw new Error(
      'discord_token in skz_bot_settings looks invalid (placeholder or malformed). Re-enter the full token in Admin → Discord bot → Credentials — do not use .env for the Discord token.',
    )
  }

  if (supabaseUrl && supabaseServiceRoleKey) {
    initSupabase(supabaseUrl, supabaseServiceRoleKey)
  }

  return {
    discordToken,
    discordClientId,
    supabaseUrl,
    supabaseServiceRoleKey,
  }
}

function normalizeDiscordToken(raw: string | undefined): string {
  if (!raw) return ''
  let token = raw.trim()
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim()
  }
  return token
}

function isPlausibleDiscordToken(token: string): boolean {
  if (!token || PLACEHOLDER_VALUES.has(token)) return false
  // Bot tokens are three dot-separated segments; reject obvious garbage early.
  const parts = token.split('.')
  if (parts.length !== 3) return false
  if (parts.some((p) => p.length < 4)) return false
  return token.length >= 50
}
