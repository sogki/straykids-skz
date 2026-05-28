import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const PLACEHOLDER = new Set(['__SECRET_SET__', '', 'undefined', 'null'])

export interface ApiConfig {
  port: number
  siteOrigin: string
  discordClientId: string
  discordClientSecret: string
  redirectUri: string
  supabase: SupabaseClient
}

let cached: ApiConfig | null = null

function env(key: string): string {
  return String(process.env[key] ?? '').trim()
}

async function loadBotSettings(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('skz_bot_settings')
    .select('key, value')
    .in('key', [
      'discord_client_id',
      'discord_client_secret',
      'supabase_url',
      'supabase_service_role_key',
      'site_url',
    ])

  if (error) throw new Error(`Failed to load bot settings: ${error.message}`)

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    map[row.key as string] = String(row.value ?? '').trim()
  }
  return map
}

function normalizeOrigin(url: string) {
  return url.replace(/\/$/, '')
}

export async function loadApiConfig(): Promise<ApiConfig> {
  if (cached) return cached

  const port = Number(env('API_PORT') || '8787')

  let supabaseUrl = env('SUPABASE_URL')
  let serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    const bootstrapUrl = env('SKZ_BOOTSTRAP_SUPABASE_URL')
    const bootstrapKey = env('SKZ_BOOTSTRAP_SUPABASE_SERVICE_ROLE_KEY')
    if (bootstrapUrl && bootstrapKey) {
      const boot = createClient(bootstrapUrl, bootstrapKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const settings = await loadBotSettings(boot)
      supabaseUrl = supabaseUrl || settings.supabase_url
      serviceKey = serviceKey || settings.supabase_service_role_key
    }
  }

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Missing Supabase service credentials for @skz/api. Add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to apps/api/.env or apps/bot/.env (same bootstrap vars the bot uses), or set SKZ_BOOTSTRAP_SUPABASE_* in apps/api/.env. The anon key from apps/web/.env is not enough — player OAuth needs the service role.',
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const settings = await loadBotSettings(supabase)

  let discordClientId = env('DISCORD_CLIENT_ID') || settings.discord_client_id
  let discordClientSecret = env('DISCORD_CLIENT_SECRET') || settings.discord_client_secret

  if (PLACEHOLDER.has(discordClientSecret)) {
    discordClientSecret = ''
  }

  if (!discordClientId) {
    throw new Error('discord_client_id is missing. Set it in Admin → Discord bot → Credentials.')
  }

  if (!discordClientSecret) {
    throw new Error(
      'discord_client_secret is missing. Add it in Admin → Discord bot → Credentials (OAuth2 client secret from Discord Developer Portal).',
    )
  }

  let siteOrigin = normalizeOrigin(settings.site_url || '')
  if (!siteOrigin) {
    siteOrigin = normalizeOrigin(env('SITE_URL') || env('VITE_SITE_URL') || 'http://localhost:5173')
  }
  if (!siteOrigin) {
    throw new Error(
      'site_url is missing. Set it in Admin → Discord bot → Credentials (e.g. https://skzarcade.com).',
    )
  }

  const redirectUri =
    env('DISCORD_OAUTH_REDIRECT_URI') || `${siteOrigin}/api/player/auth/discord/callback`

  cached = {
    port,
    siteOrigin,
    discordClientId,
    discordClientSecret,
    redirectUri,
    supabase,
  }

  return cached
}

export function clearConfigCache() {
  cached = null
}
