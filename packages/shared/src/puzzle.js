/**
 * Pure daily-puzzle helpers — safe to import from web, bot, scripts.
 *
 * The web has additional helpers in `apps/web/src/utils/dailyPuzzle.js` that
 * touch localStorage (state persistence, pick history). Those are web-only;
 * everything here is environment-agnostic.
 */

/** Local date key YYYY-MM-DD (uses host's local timezone). */
export function getTodayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Deterministic daily index from a date string + pool size. Same date always
 * returns the same index for a given pool length.
 */
export function getDailyIndex(dateKey, poolSize) {
  if (!poolSize) return 0
  let hash = 0
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0
  }
  return hash % poolSize
}

/**
 * Pick today's puzzle from a pool, sorted by ID first so the same date
 * resolves to the same puzzle even if the pool reorders between deploys.
 *
 * Pure — no IO. The web app layers a "recent picks" filter on top of this
 * in its own `dailyPuzzle.js`; the bot is welcome to do the same with its
 * own storage (Supabase, sqlite, etc.).
 */
export function pickDailyPuzzle(pool, dateKey = getTodayKey()) {
  if (!pool?.length) return null
  const ordered = [...pool].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  )
  const index = getDailyIndex(dateKey, ordered.length)
  return { ...ordered[index], dateKey }
}
