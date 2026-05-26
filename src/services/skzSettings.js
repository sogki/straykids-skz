import { SITE_LOGOS, SITE_LOGO_CACHE_BUST } from '@/data/site'
import { getSupabaseClient } from '../lib/supabase/client'
import { getStorageBucketFromEnv } from '../lib/supabase/credentials'
import { resolveSkzAssetUrl } from '../lib/supabase/storage'

const DEFAULTS = {
  hero_image_url: '',
  site_title: 'SKZ Arcade',
  site_tagline: 'Daily puzzles and minigames for STAYs',
  site_logo_url: SITE_LOGOS.white,
  site_logo_black_url: SITE_LOGOS.black,
  max_daily_guesses: '5',
  storage_bucket: getStorageBucketFromEnv(),
}

/** Always fetch public settings from DB (fresh each page load). */
export async function fetchPublicSettings() {
  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('skz_settings')
      .select('key, value, updated_at')
      .eq('is_public', true)

    if (error) throw error

    const config = { ...DEFAULTS }
    let latestUpdate = 0

    for (const row of data ?? []) {
      config[row.key] = row.value
      const t = new Date(row.updated_at).getTime()
      if (t > latestUpdate) latestUpdate = t
    }

    config._settingsVersion = latestUpdate
    config._loadedFromDb = true

    return config
  } catch (err) {
    console.warn('[skz] Could not load skz_settings:', err.message)
    return {
      ...DEFAULTS,
      _loadedFromDb: false,
      _settingsError: err.message,
    }
  }
}

export function getHeroImageUrl(settings, supabaseUrl) {
  const envHero = import.meta.env.VITE_HERO_IMAGE_URL?.trim()
  if (envHero?.startsWith('http')) return envHero

  const raw = settings?.hero_image_url?.trim()
  if (!raw) return null

  const bucket = settings?.storage_bucket || getStorageBucketFromEnv()
  const resolved = resolveSkzAssetUrl(raw, supabaseUrl, bucket)
  if (!resolved) return null

  const v = settings?._settingsVersion
  if (v) {
    const sep = resolved.includes('?') ? '&' : '?'
    return `${resolved}${sep}v=${v}`
  }

  return resolved
}

/**
 * @param {'white' | 'black'} variant — white logo on dark UI, black on light UI
 */
export function getSiteLogoUrl(settings, supabaseUrl, variant = 'white') {
  const key = variant === 'black' ? 'site_logo_black_url' : 'site_logo_url'
  const fallback = variant === 'black' ? SITE_LOGOS.black : SITE_LOGOS.white
  const raw = settings?.[key]?.trim() || fallback

  if (raw.startsWith('http')) {
    const v = settings?._settingsVersion || SITE_LOGO_CACHE_BUST
    const sep = raw.includes('?') ? '&' : '?'
    return `${raw}${sep}v=${v}`
  }

  const bucket = settings?.storage_bucket || getStorageBucketFromEnv()
  const resolved = resolveSkzAssetUrl(raw, supabaseUrl, bucket)
  return resolved || fallback
}

/** Dev-friendly hint when hero is missing */
export function getHeroDebugInfo(settings, supabaseUrl) {
  const raw = settings?.hero_image_url
  const resolved = getHeroImageUrl(settings, supabaseUrl)
  return {
    connected: Boolean(settings?._loadedFromDb),
    settingsError: settings?._settingsError,
    rawHeroValue: raw || '(empty)',
    resolvedUrl: resolved || '(none)',
    supabaseUrl: supabaseUrl || '(not loaded)',
    bucket: settings?.storage_bucket || getStorageBucketFromEnv(),
  }
}
