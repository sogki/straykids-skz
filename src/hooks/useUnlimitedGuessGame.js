import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getHintLadder, isAnswerCorrect } from '@/utils/dailyPuzzle'

const HISTORY_PREFIX = 'skz-unlimited-history-'
const STATS_PREFIX = 'skz-unlimited-stats-'
const PENDING_PREFIX = 'skz-unlimited-pending-'
const RECENT_LIMIT = 8

function safeLocalGet(key) {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeLocalSet(key, value) {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, value)
  } catch {
    /* storage may be blocked – fail silently */
  }
}

function readRecent(storageGame) {
  const raw = safeLocalGet(HISTORY_PREFIX + storageGame)
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((id) => typeof id === 'string')
  } catch {
    return []
  }
}

function writeRecent(storageGame, ids) {
  safeLocalSet(HISTORY_PREFIX + storageGame, JSON.stringify(ids.slice(0, RECENT_LIMIT)))
}

function readStats(storageGame) {
  const raw = safeLocalGet(STATS_PREFIX + storageGame)
  if (!raw) return { played: 0, wins: 0, streak: 0, bestStreak: 0 }
  try {
    const obj = JSON.parse(raw)
    return {
      played: Number(obj.played) || 0,
      wins: Number(obj.wins) || 0,
      streak: Number(obj.streak) || 0,
      bestStreak: Number(obj.bestStreak) || 0,
    }
  } catch {
    return { played: 0, wins: 0, streak: 0, bestStreak: 0 }
  }
}

function writeStats(storageGame, stats) {
  safeLocalSet(STATS_PREFIX + storageGame, JSON.stringify(stats))
}

function readPending(storageGame) {
  return safeLocalGet(PENDING_PREFIX + storageGame) === '1'
}

function writePending(storageGame, value) {
  if (value) {
    safeLocalSet(PENDING_PREFIX + storageGame, '1')
  } else {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(PENDING_PREFIX + storageGame)
      }
    } catch {
      /* ignore */
    }
  }
}

/**
 * Read stats, but if an "abandoned wrong-guess round" flag is present from a
 * previous tab/refresh, treat it as a loss before reading. This guarantees
 * the user can't refresh mid-round to preserve a streak after a wrong answer.
 */
function resolveInitialStats(storageGame) {
  const base = readStats(storageGame)
  if (!readPending(storageGame)) return base
  const reset = { ...base, streak: 0 }
  writeStats(storageGame, reset)
  writePending(storageGame, false)
  return reset
}

/**
 * Random non-repeating puzzle picker.
 * - Skips today's daily puzzle id (so the unlimited round never matches the daily).
 * - Skips the most recent N picks for variety within a session.
 * - Falls back to "anything-but-current" if every option has been excluded.
 */
function pickUnlimitedPuzzle(pool, { excludeIds = [], recentIds = [], currentId = null } = {}) {
  if (!pool?.length) return null

  const exclude = new Set([...excludeIds, ...recentIds, currentId].filter(Boolean))
  let candidates = pool.filter((p) => !exclude.has(p.id))

  if (!candidates.length) {
    // Drop the recent-history filter, keep the daily exclusion + current.
    const strict = new Set([...excludeIds, currentId].filter(Boolean))
    candidates = pool.filter((p) => !strict.has(p.id))
  }

  if (!candidates.length) {
    // Only the daily-excluded item remains in pool — return anything except current.
    candidates = pool.filter((p) => p.id !== currentId)
  }

  if (!candidates.length) candidates = pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/**
 * Endless/unlimited variant of the daily guessing loop.
 *
 * Differences from `useDailyGuessGame`:
 *   • Picks a random puzzle every round (never today's daily; never the last few).
 *   • Exposes `playAgain()` to load a fresh puzzle on demand.
 *   • Tracks lightweight stats (played, wins, current streak, best streak).
 *   • Does not persist per-puzzle state — each round is ephemeral.
 */
export function useUnlimitedGuessGame({
  pool,
  excludeIds = [],
  storageGame,
  trackId,
  maxGuesses = 5,
}) {
  const [puzzle, setPuzzle] = useState(null)
  const [guesses, setGuesses] = useState([])
  const [status, setStatus] = useState('playing')
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const [toast, setToast] = useState(null)
  const [stats, setStats] = useState(() => resolveInitialStats(storageGame))

  const recentRef = useRef(readRecent(storageGame))
  const initialisedRef = useRef(false)
  const excludeKey = useMemo(
    () => excludeIds.filter(Boolean).join('|'),
    [excludeIds]
  )

  // Initial puzzle pick (once pool + exclusions are known).
  useEffect(() => {
    if (initialisedRef.current) return
    if (!pool?.length) return

    const picked = pickUnlimitedPuzzle(pool, {
      excludeIds,
      recentIds: recentRef.current,
    })
    if (!picked) return

    setPuzzle(picked)
    setGuesses([])
    setStatus('playing')
    setInput('')
    initialisedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, excludeKey])

  const wrongCount = useMemo(() => {
    if (!puzzle || !guesses.length) return 0
    return guesses.filter((g) => !isAnswerCorrect(g, puzzle)).length
  }, [puzzle, guesses])

  const playing = status === 'playing'
  const won = status === 'won'
  const lost = status === 'lost'
  const gameOver = won || lost
  const triesLeft = maxGuesses - wrongCount

  const hintLadder = useMemo(() => {
    if (!puzzle) return []
    return getHintLadder(puzzle, wrongCount, false)
  }, [puzzle, wrongCount])

  const recordOutcome = useCallback(
    (outcome) => {
      setStats((prev) => {
        const isWin = outcome === 'won'
        const nextStreak = isWin ? prev.streak + 1 : 0
        const next = {
          played: prev.played + 1,
          wins: prev.wins + (isWin ? 1 : 0),
          streak: nextStreak,
          bestStreak: Math.max(prev.bestStreak, nextStreak),
        }
        writeStats(storageGame, next)
        return next
      })
      writePending(storageGame, false)
    },
    [storageGame]
  )

  const pushRecent = useCallback(
    (id) => {
      if (!id) return
      const next = [id, ...recentRef.current.filter((x) => x !== id)].slice(
        0,
        RECENT_LIMIT
      )
      recentRef.current = next
      writeRecent(storageGame, next)
    },
    [storageGame]
  )

  function showWrongToast(missCount) {
    const nextReveal = puzzle?.reveals?.[missCount]
    setToast(nextReveal ? `${nextReveal.label || 'Clue'} unlocked` : 'Not quite')
    setTimeout(() => setToast(null), 2500)
  }

  function handleGuess() {
    if (!input.trim() || !playing || !puzzle) return

    const guess = input.trim()
    if (guesses.some((g) => g.toLowerCase() === guess.toLowerCase())) {
      setToast('Already guessed')
      setTimeout(() => setToast(null), 2000)
      return
    }

    if (isAnswerCorrect(guess, puzzle)) {
      setGuesses((g) => [...g, guess])
      setStatus('won')
      setInput('')
      setToast(null)
      pushRecent(puzzle.id)
      recordOutcome('won')
      return
    }

    const nextGuesses = [...guesses, guess]
    if (nextGuesses.length >= maxGuesses) {
      setGuesses(nextGuesses)
      setStatus('lost')
      setToast(null)
      pushRecent(puzzle.id)
      recordOutcome('lost')
    } else {
      // Mark this round as "abandoned-on-refresh = loss": any future mount with
      // this flag still set will zero out the streak.
      writePending(storageGame, true)
      setGuesses(nextGuesses)
      showWrongToast(nextGuesses.length)
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && playing) handleGuess()
  }

  const playAgain = useCallback(() => {
    if (!pool?.length) return
    const picked = pickUnlimitedPuzzle(pool, {
      excludeIds,
      recentIds: recentRef.current,
      currentId: puzzle?.id ?? null,
    })
    if (!picked) return
    setPuzzle(picked)
    setGuesses([])
    setStatus('playing')
    setInput('')
    setToast(null)
    writePending(storageGame, false)
  }, [pool, excludeIds, puzzle, storageGame])

  // Mirror the daily-hook shape (state object) so shared UI components keep working.
  const state = puzzle
    ? {
        dateKey: 'unlimited',
        puzzleId: puzzle.id,
        guesses,
        status,
      }
    : null

  return {
    mode: 'unlimited',
    puzzle,
    state,
    input,
    setInput,
    shake,
    toast,
    playing,
    won,
    lost,
    gameOver,
    triesLeft,
    maxGuesses,
    hintLadder,
    stats,
    handleGuess,
    handleKeyDown,
    playAgain,
    trackId,
  }
}
