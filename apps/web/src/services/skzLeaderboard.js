import { getSupabaseClient } from '@/lib/supabase/client'

async function fetchExcludedCountryCodes() {
  try {
    const supabase = await getSupabaseClient()

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'skz_get_leaderboard_excluded_countries'
    )
    if (!rpcError && Array.isArray(rpcData)) {
      return rpcData.filter((c) => typeof c === 'string' && c.length === 2)
    }

    const { data: rows, error: tableError } = await supabase
      .from('skz_analytics_excluded_countries')
      .select('country_code')

    if (tableError) return []
    return (rows ?? [])
      .map((r) => r.country_code)
      .filter((c) => typeof c === 'string' && c.length === 2)
  } catch {
    return []
  }
}

function filterExcludedEntries(board, excluded) {
  if (!board?.entries?.length || !excluded?.length) return board
  const blocked = new Set(excluded.map((c) => c.toUpperCase()))
  const entries = board.entries.filter(
    (e) => !blocked.has((e.country_code ?? '').toUpperCase())
  )
  return { ...board, entries }
}

/**
 * @param {number} days
 * @param {string} gameSlug
 * @param {{ limit?: number, offset?: number }} [opts]
 */
export async function fetchPublicLeaderboard(days = 30, gameSlug = 'guess-song', opts = {}) {
  const limit = opts.limit ?? 10
  const offset = opts.offset ?? 0

  try {
    const supabase = await getSupabaseClient()
    const [boardResult, excluded] = await Promise.all([
      supabase.rpc('skz_get_public_leaderboard', {
        p_days: days,
        p_game_slug: gameSlug,
        p_limit: limit,
        p_offset: offset,
      }),
      fetchExcludedCountryCodes(),
    ])

    const { data, error } = boardResult
    if (error) throw error

    const board = data ?? {
      days,
      game_slug: gameSlug,
      entries: [],
      total_count: 0,
      limit,
      offset,
    }
    return filterExcludedEntries(board, excluded)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[skz leaderboard]', err.message)
    }
    return { days, game_slug: gameSlug, entries: [], total_count: 0, limit, offset }
  }
}
