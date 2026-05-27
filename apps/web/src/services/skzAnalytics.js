import { getSupabaseClient } from '@/lib/supabase/client'
import { getVisitorCountryCode } from '@/utils/country'

const SESSION_KEY = 'skz_analytics_session'

function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`
      localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return 'anonymous'
  }
}

/**
 * Record a visitor event (page views, game starts, etc.) via RPC.
 */
export async function trackEvent(eventType, { path, gameSlug, metadata } = {}) {
  try {
    const supabase = await getSupabaseClient()
    await supabase.rpc('skz_track_event', {
      p_event_type: eventType,
      p_path: path ?? (typeof window !== 'undefined' ? window.location.pathname : null),
      p_game_slug: gameSlug ?? null,
      p_session_id: getSessionId(),
      p_metadata: metadata ?? {},
      p_country_code: (() => {
        const c = getVisitorCountryCode()
        return c && c !== 'XX' ? c : null
      })(),
    })
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[skz analytics]', eventType, err.message)
    }
  }
}

export function trackPageView(path) {
  return trackEvent('page_view', { path })
}

export function trackGameStart(gameSlug) {
  return trackEvent('game_start', { gameSlug, path: `/${gameSlug}` })
}

export function trackGameComplete(gameSlug, metadata = {}) {
  return trackEvent('game_complete', { gameSlug, metadata })
}

/**
 * Unlimited rounds use a dedicated event type so they NEVER count toward the
 * public leaderboard (which queries `game_complete`) or daily-only KPIs.
 * Useful for separate analytics if we ever want engagement insights.
 */
export function trackUnlimitedRoundStart(gameSlug, metadata = {}) {
  return trackEvent('unlimited_round_start', { gameSlug, metadata })
}

export function trackUnlimitedRoundComplete(gameSlug, metadata = {}) {
  return trackEvent('unlimited_round_complete', { gameSlug, metadata })
}
