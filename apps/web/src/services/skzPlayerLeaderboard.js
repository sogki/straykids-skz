import { getSupabaseClient } from '@/lib/supabase/client'
import { getStoredPlayerSession } from '@/services/skzPlayerAuth'

export async function fetchGlobalPlayerLeaderboard(days = null, limit = 25) {
  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase.rpc('skz_get_global_player_leaderboard', {
      p_days: days,
      p_limit: limit,
    })
    if (error) throw error
    return data ?? { days, entries: [] }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[skz player leaderboard]', err.message)
    }
    return { days, entries: [] }
  }
}

/**
 * Award leaderboard points after a daily win (1 point per correct guess).
 * @param {string} gameSlug - guess-song | guess-member | guess-lyric
 * @param {string} puzzleDate - YYYY-MM-DD
 * @param {number} correctGuesses - count of correct guesses (usually 1 on win)
 */
export async function recordPlayerDailyPoints(gameSlug, puzzleDate, correctGuesses) {
  const token = getStoredPlayerSession()
  if (!token) return { skipped: true, reason: 'not_linked' }

  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase.rpc('skz_player_record_daily_points', {
      p_session_token: token,
      p_game_slug: gameSlug,
      p_puzzle_date: puzzleDate,
      p_correct_guesses: Math.max(0, Number(correctGuesses) || 0),
    })
    if (error) throw error
    return data
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[skz player points]', gameSlug, err.message)
    }
    return { error: err.message }
  }
}
