import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCategory, getCategoryItems } from '@/data/higherLowerData'

const BEST_STREAK_PREFIX = 'skz-hl-best-'
const RECENT_LIMIT = 4

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
    /* storage may be blocked */
  }
}

function readBestStreak(categoryId) {
  const raw = safeLocalGet(BEST_STREAK_PREFIX + categoryId)
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function writeBestStreak(categoryId, value) {
  safeLocalSet(BEST_STREAK_PREFIX + categoryId, String(value))
}

function pickFrom(pool, excludeIds, fallbackId = null) {
  const exclude = new Set(excludeIds.filter(Boolean))
  let candidates = pool.filter((p) => !exclude.has(p.id))
  if (!candidates.length) {
    candidates = pool.filter((p) => p.id !== fallbackId)
  }
  if (!candidates.length) candidates = pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/**
 * Higher or Lower state machine.
 *
 * Round shape:
 *   left  = revealed card (current "anchor")
 *   right = hidden card the player guesses about
 *   After a correct pick, the right card slides into the left slot and a
 *   new hidden card replaces it. The pool excludes the most recent ~4 picks
 *   so consecutive rounds don't repeat the same items.
 */
export function useHigherLower({ categoryId }) {
  const category = useMemo(() => getCategory(categoryId), [categoryId])
  const items = useMemo(
    () => (categoryId ? getCategoryItems(categoryId) : []),
    [categoryId]
  )

  const [left, setLeft] = useState(null)
  const [right, setRight] = useState(null)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState('idle') // idle | playing | reveal | over
  const [lastPickCorrect, setLastPickCorrect] = useState(null)
  const [bestStreak, setBestStreak] = useState(() => readBestStreak(categoryId))

  const recentRef = useRef([])

  // Keep best-streak in sync when category changes.
  useEffect(() => {
    setBestStreak(readBestStreak(categoryId))
  }, [categoryId])

  const startNewGame = useCallback(() => {
    if (!items.length || items.length < 2) {
      setStatus('idle')
      return
    }
    recentRef.current = []
    const a = pickFrom(items, [])
    const b = pickFrom(items, [a.id])
    recentRef.current = [a.id, b.id]
    setLeft(a)
    setRight(b)
    setScore(0)
    setStatus('playing')
    setLastPickCorrect(null)
  }, [items])

  // Auto-start when items become available (no separate intro step needed).
  useEffect(() => {
    if (status === 'idle' && items.length >= 2) {
      startNewGame()
    }
  }, [status, items.length, startNewGame])

  // Persist best streak when score eclipses it (during play, not just on game over).
  useEffect(() => {
    if (score > bestStreak) {
      setBestStreak(score)
      writeBestStreak(categoryId, score)
    }
  }, [score, bestStreak, categoryId])

  const checkGuess = useCallback(
    (direction) => {
      if (!left || !right || status !== 'playing') return
      const lv = left.value
      const rv = right.value
      const tied = rv === lv
      const correct =
        tied ||
        (direction === 'higher' && rv > lv) ||
        (direction === 'lower' && rv < lv)

      setLastPickCorrect(correct)
      setStatus('reveal')

      if (!correct) {
        // Brief reveal pause then game-over.
        setTimeout(() => setStatus('over'), 950)
        return
      }

      // Correct: advance after a short reveal animation.
      setTimeout(() => {
        setScore((s) => s + 1)
        const nextRecent = [right.id, ...recentRef.current].slice(0, RECENT_LIMIT)
        recentRef.current = nextRecent
        const next = pickFrom(items, [...nextRecent, right.id], right.id)
        setLeft(right)
        setRight(next)
        setStatus('playing')
        setLastPickCorrect(null)
      }, 900)
    },
    [items, left, right, status]
  )

  const ready = items.length >= 2 && Boolean(category)

  return {
    category,
    ready,
    left,
    right,
    score,
    status,
    bestStreak,
    lastPickCorrect,
    pickHigher: () => checkGuess('higher'),
    pickLower: () => checkGuess('lower'),
    playAgain: startNewGame,
  }
}
