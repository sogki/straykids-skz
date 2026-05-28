import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '../db/supabase.js'

const PLACEHOLDER = new Set(['__SECRET_SET__', '', 'undefined', 'null'])

export interface PlayerAuthConfig {
  siteOrigin: string
  discordClientId: string
  discordClientSecret: string
  redirectUri: string
  supabase: SupabaseClient
}

let cached: PlayerAuthConfig | null = null

function normalizeOrigin(url: string) {
  return url.replace(/\/$/, '')
}

export function clearPlayerAuthConfigCache() {
  cached = null
}

/** Player OAuth config from skz_bot_settings (same DB as the Discord bot). */
export async function loadPlayerAuthConfig(): Promise<PlayerAuthConfig> {
  if (cached) return cached

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('skz_bot_settings')
    .select('key, value')
    .in('key', ['discord_client_id', 'discord_client_secret', 'site_url'])

  if (error) throw new Error(`Failed to load bot settings: ${error.message}`)

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    map[row.key as string] = String(row.value ?? '').trim()
  }

  const discordClientId = map.discord_client_id ?? ''
  let discordClientSecret = map.discord_client_secret ?? ''
  if (PLACEHOLDER.has(discordClientSecret)) discordClientSecret = ''
  if (!discordClientSecret) {
    discordClientSecret = String(process.env.DISCORD_CLIENT_SECRET ?? '').trim()
  }

  if (!discordClientId) {
    throw new Error(
      'discord_client_id is missing. Set it in Admin → Discord bot → Credentials.',
    )
  }

  if (!discordClientSecret) {
    throw new Error(
      'discord_client_secret is missing. In Admin → Discord bot → Credentials, paste the OAuth2 Client Secret from Discord Developer Portal → OAuth2, click Save settings, then /reload in Discord. Or set DISCORD_CLIENT_SECRET on Railway.',
    )
  }

  let siteOrigin = normalizeOrigin(map.site_url || '')
  if (!siteOrigin) {
    siteOrigin = normalizeOrigin(
      String(process.env.SITE_URL || process.env.PUBLIC_SITE_URL || '').trim(),
    )
  }
  if (!siteOrigin) {
    throw new Error(
      'site_url is missing. Set it in Admin → Discord bot → Credentials (e.g. https://skzarcade.com).',
    )
  }

  const redirectUri =
    String(process.env.DISCORD_OAUTH_REDIRECT_URI || '').trim() ||
    `${siteOrigin}/api/player/auth/discord/callback`

  cached = {
    siteOrigin,
    discordClientId,
    discordClientSecret,
    redirectUri,
    supabase,
  }

  return cached
}
