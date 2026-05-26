import { normalizeAnswer } from './checkAnswer'

const STORAGE_PREFIXES = {
  song: 'skz-daily-guess-',
  member: 'skz-daily-member-',
  lyric: 'skz-daily-lyric-',
}

function storagePrefix(game = 'song') {
  return STORAGE_PREFIXES[game] ?? STORAGE_PREFIXES.song
}

const HINT_TYPE_LABELS = {
  prompt: 'Question',
  emoji: 'Emoji clue',
  category: 'Category',
  hint: 'Written hint',
  letters: 'Letter reveal',
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

/** Pick puzzle from a local pool (same date → same index). */
export function getDailyPuzzleFromPool(pool, dateKey = getTodayKey()) {
  if (!pool?.length) return null
  const index = getDailyIndex(dateKey, pool.length)
  const puzzle = pool[index]
  if (!puzzle) return null
  return { ...puzzle, dateKey }
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

/** Letter mask — reveals more letters after each wrong guess */
export function getLetterHint(answer, revealLevel) {
  const clean = normalizeAnswer(answer).replace(/\s/g, '')
  if (revealLevel <= 0) return null

  const chars = clean.split('')
  const revealCount = Math.min(
    chars.length,
    Math.ceil((revealLevel / 5) * chars.length) + 1
  )
  const indices = new Set()
  for (let i = 0; i < revealCount; i++) {
    indices.add(i % chars.length)
    indices.add(Math.floor((i * chars.length) / revealCount) % chars.length)
  }

  return chars
    .map((c, i) => (indices.has(i) ? c.toUpperCase() : '_'))
    .join(' ')
}

function resolveHintContent(reveal, puzzle, wrongCount) {
  if (reveal.type === 'letters') {
    const name = puzzle.displayAnswer || puzzle.answers[0]
    return getLetterHint(name, wrongCount + 1) || '—'
  }
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
      content: resolveHintContent(reveal, puzzle, wrongCount),
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
