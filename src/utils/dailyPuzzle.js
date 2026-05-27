import { normalizeAnswer } from './checkAnswer'

const STORAGE_PREFIXES = {
  song: 'skz-daily-guess-',
  member: 'skz-daily-member-',
  lyric: 'skz-daily-lyric-',
}

const HISTORY_KEYS = {
  song: 'skz-daily-history-song',
  member: 'skz-daily-history-member',
  lyric: 'skz-daily-history-lyric',
}

// Don't repeat the daily within this many recent picks. Tuned vs. typical
// pool size (~60) so most of the catalog cycles before any repeats.
const DAILY_RECENT_WINDOW = 21

function storagePrefix(game = 'song') {
  return STORAGE_PREFIXES[game] ?? STORAGE_PREFIXES.song
}

function safeGet(key) {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key, value) {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, value)
  } catch {
    /* storage may be blocked */
  }
}

function readPickHistory(game) {
  const key = HISTORY_KEYS[game] ?? HISTORY_KEYS.song
  const raw = safeGet(key)
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((id) => typeof id === 'string')
  } catch {
    return []
  }
}

function writePickHistory(game, ids) {
  const key = HISTORY_KEYS[game] ?? HISTORY_KEYS.song
  safeSet(key, JSON.stringify(ids.slice(0, DAILY_RECENT_WINDOW * 2)))
}

/** Record that a puzzle was picked for the user — used to avoid repeats. */
export function recordDailyPick(game, puzzleId) {
  if (!puzzleId) return
  const current = readPickHistory(game)
  if (current[0] === puzzleId) return // already at the top, no-op
  const next = [puzzleId, ...current.filter((id) => id !== puzzleId)]
  writePickHistory(game, next)
}

const HINT_TYPE_LABELS = {
  prompt: 'Question',
  emoji: 'Emoji clue',
  category: 'Category',
  hint: 'Written hint',
  year: 'Release year',
  era: 'Comeback era',
  lyric: 'Lyric',
  skzoo: 'SKZOO',
}

/** Local date key YYYY-MM-DD */
export function getTodayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Deterministic daily index from date + pool size */
export function getDailyIndex(dateKey, poolSize) {
  let hash = 0
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0
  }
  return hash % poolSize
}

function storageKey(dateKey, game = 'song') {
  return `${storagePrefix(game)}${dateKey}`
}

/**
 * Pick today's puzzle from a pool, walking past anything in the user's recent
 * history so the same answer doesn't pop up day after day.
 *
 * Uses a stable ID-sorted order so the same hash always points to the same
 * puzzle even if the pool reorders between deploys.
 */
export function getDailyPuzzleFromPool(pool, dateKey = getTodayKey(), game = 'song') {
  if (!pool?.length) return null

  const ordered = [...pool].sort((a, b) => String(a.id).localeCompare(String(b.id)))
  const startIndex = getDailyIndex(dateKey, ordered.length)
  const recent = new Set(readPickHistory(game).slice(0, DAILY_RECENT_WINDOW))

  for (let i = 0; i < ordered.length; i++) {
    const candidate = ordered[(startIndex + i) % ordered.length]
    if (!recent.has(candidate.id)) {
      return { ...candidate, dateKey }
    }
  }

  return { ...ordered[startIndex], dateKey }
}

/**
 * Resolve today's puzzle for the daily-guess hook.
 *
 * - If the user has saved state for today AND that puzzle is still in the
 *   pool, returns that puzzle. This keeps progress intact across deploys
 *   that may add/remove/reorder puzzles.
 * - Otherwise picks a fresh puzzle with variety + records it in history.
 */
export function resolveDailyPuzzle(pool, dateKey, game) {
  if (!pool?.length) return null

  const saved = loadDailyState(dateKey, game)
  if (saved?.puzzleId) {
    const locked = pool.find((p) => p.id === saved.puzzleId)
    if (locked) return { ...locked, dateKey }
  }

  const picked = getDailyPuzzleFromPool(pool, dateKey, game)
  if (picked) recordDailyPick(game, picked.id)
  return picked
}

export function loadDailyState(dateKey = getTodayKey(), game = 'song') {
  try {
    const raw = localStorage.getItem(storageKey(dateKey, game))
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.dateKey !== dateKey) return null
    return data
  } catch {
    return null
  }
}

export function saveDailyState(state, game = 'song') {
  localStorage.setItem(storageKey(state.dateKey, game), JSON.stringify(state))
}

export function createInitialState(puzzle) {
  return {
    dateKey: puzzle.dateKey,
    puzzleId: puzzle.id,
    guesses: [],
    status: 'playing',
  }
}

export function isAnswerCorrect(input, puzzle) {
  return puzzle.answers.some(
    (a) => normalizeAnswer(a) === normalizeAnswer(input)
  )
}

function resolveHintContent(reveal, puzzle) {
  if (reveal.type === 'prompt' && puzzle.prompt) {
    return puzzle.prompt
  }
  return reveal.content
}

/**
 * Full hint ladder with locked / unlocked state for the UI.
 * @param {boolean} revealAll - true when game ended (show every hint)
 */
export function getHintLadder(puzzle, wrongCount, revealAll = false) {
  if (!puzzle?.reveals?.length) return []

  return puzzle.reveals.map((reveal, index) => {
    const unlocked = revealAll || index <= wrongCount
    const unlocksAfterMiss = index

    return {
      index,
      type: reveal.type,
      label: reveal.label || HINT_TYPE_LABELS[reveal.type] || 'Hint',
      content: resolveHintContent(reveal, puzzle),
      unlocked,
      unlocksAfterMiss,
      unlockLabel:
        index === 0
          ? 'Available now'
          : `Unlocks after ${index} wrong ${index === 1 ? 'guess' : 'guesses'}`,
    }
  })
}

/** @deprecated Use getHintLadder */
export function getUnlockedHints(puzzle, wrongCount) {
  return getHintLadder(puzzle, wrongCount)
    .filter((h) => h.unlocked)
    .map(({ type, label, content }) => ({ type, label, content }))
}

export function formatCountdown() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const diff = Math.max(0, midnight - now)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
