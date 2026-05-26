import { getSupabaseClient } from '../lib/supabase/client'
import { resolveSkzAssetUrl } from '../lib/supabase/storage'
import { games as fallbackGames } from '../data/games'

function mapGame(row, supabaseUrl, bucket) {
  return {
    id: row.slug,
    slug: row.slug,
    title: row.title,
    description: row.description,
    emoji: row.emoji,
    path: row.path,
    color: row.color,
    tag: row.tag,
    sortOrder: row.sort_order,
    isActive: row.is_active !== false,
    image: row.image_url
      ? resolveSkzAssetUrl(row.image_url, supabaseUrl, bucket)
      : null,
  }
}

/**
 * Merge DB rows with local fallback so new games always appear in nav/arcade,
 * but disabled DB rows override the fallback so admins can hide games.
 */
export function mergeGameLists(dbGames, fallback = fallbackGames) {
  const bySlug = new Map()
  for (const game of fallback) {
    bySlug.set(game.slug ?? game.id, {
      ...game,
      sortOrder: game.sortOrder ?? 999,
      isActive: game.isActive ?? true,
    })
  }
  for (const game of dbGames) {
    bySlug.set(game.slug ?? game.id, game)
  }
  return [...bySlug.values()]
    .filter((g) => g.isActive !== false)
    .sort((a, b) => {
      const ao = a.sortOrder ?? 999
      const bo = b.sortOrder ?? 999
      if (ao !== bo) return ao - bo
      return a.title.localeCompare(b.title)
    })
}

export async function fetchGames(supabaseUrl, bucket = 'skz_arcade') {
  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('skz_games')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error
    const dbGames = (data ?? []).map((row) => ({
      ...mapGame(row, supabaseUrl, bucket),
      sortOrder: row.sort_order,
    }))
    return mergeGameLists(dbGames, fallbackGames)
  } catch (err) {
    console.warn('[skz] Using fallback games:', err.message)
    return fallbackGames.filter((g) => g.isActive !== false)
  }
}
