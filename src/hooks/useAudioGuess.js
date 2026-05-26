import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { audioGameTracks } from '@/data/audioGameTracks'
import { normalizeAnswer } from '@/utils/checkAnswer'
import { getDailyIndex, getTodayKey } from '@/utils/dailyPuzzle'

/**
 * Reveal cadence (seconds of audio playable at each stage):
 *   guess 0 → 2s   (before first guess)
 *   guess 1 → 8s   (after one wrong guess)
 *   guess 2 → 15s  (after two wrong guesses)
 *   guess 3 / win → 30s (full preview revealed)
 */
export const REVEAL_LENGTHS = [2, 8, 15, 30]
export const MAX_GUESSES = 3

const DAILY_STORAGE_PREFIX = 'skz-audio-daily-'
const UNLIMITED_HISTORY_KEY = 'skz-audio-unlimited-history'
const UNLIMITED_STATS_KEY = 'skz-audio-unlimited-stats'
const UNLIMITED_PENDING_KEY = 'skz-audio-unlimited-pending'
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
    /* storage may be blocked */
  }
}

function safeLocalRemove(key) {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function readJson(key, fallback) {
  const raw = safeLocalGet(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function isCorrect(input, track) {
  if (!input || !track?.answers?.length) return false
  const norm = normalizeAnswer(input)
  if (!norm) return false
  return track.answers.some((a) => normalizeAnswer(a) === norm)
}

function pickDailyTrack(dateKey) {
  if (!audioGameTracks.length) return null
  const index = getDailyIndex(`audio-${dateKey}`, audioGameTracks.length)
  return audioGameTracks[index]
}

function pickUnlimitedTrack({ excludeIds = [], recentIds = [], currentId = null } = {}) {
  if (!audioGameTracks.length) return null
  const exclude = new Set([...excludeIds, ...recentIds, currentId].filter(Boolean))
  let candidates = audioGameTracks.filter((t) => !exclude.has(t.id))
  if (!candidates.length) {
    const strict = new Set([...excludeIds, currentId].filter(Boolean))
    candidates = audioGameTracks.filter((t) => !strict.has(t.id))
  }
  if (!candidates.length) {
    candidates = audioGameTracks.filter((t) => t.id !== currentId)
  }
  if (!candidates.length) candidates = audioGameTracks
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function readUnlimitedRecent() {
  const arr = readJson(UNLIMITED_HISTORY_KEY, [])
  return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
}

function writeUnlimitedRecent(ids) {
  safeLocalSet(UNLIMITED_HISTORY_KEY, JSON.stringify(ids.slice(0, RECENT_LIMIT)))
}

function readUnlimitedStats() {
  const obj = readJson(UNLIMITED_STATS_KEY, null)
  if (!obj || typeof obj !== 'object') {
    return { played: 0, wins: 0, streak: 0, bestStreak: 0 }
  }
  return {
    played: Number(obj.played) || 0,
    wins: Number(obj.wins) || 0,
    streak: Number(obj.streak) || 0,
    bestStreak: Number(obj.bestStreak) || 0,
  }
}

function writeUnlimitedStats(stats) {
  safeLocalSet(UNLIMITED_STATS_KEY, JSON.stringify(stats))
}

function readUnlimitedPending() {
  return safeLocalGet(UNLIMITED_PENDING_KEY) === '1'
}

function writeUnlimitedPending(value) {
  if (value) safeLocalSet(UNLIMITED_PENDING_KEY, '1')
  else safeLocalRemove(UNLIMITED_PENDING_KEY)
}

function resolveUnlimitedStats() {
  const base = readUnlimitedStats()
  if (!readUnlimitedPending()) return base
  const reset = { ...base, streak: 0 }
  writeUnlimitedStats(reset)
  writeUnlimitedPending(false)
  return reset
}

function dailyStorageKey(dateKey) {
  return `${DAILY_STORAGE_PREFIX}${dateKey}`
}

function loadDailyState(dateKey, trackId) {
  const data = readJson(dailyStorageKey(dateKey), null)
  if (!data || data.dateKey !== dateKey) return null
  if (data.trackId !== trackId) return null
  return data
}

function saveDailyState(state) {
  safeLocalSet(dailyStorageKey(state.dateKey), JSON.stringify(state))
}

function defaultState(trackId, dateKey = 'unlimited') {
  return {
    dateKey,
    trackId,
    guesses: [],
    status: 'playing',
    tracked: false,
  }
}

/**
 * useAudioGuess powers both the daily and unlimited audio-guess routes.
 *
 *   mode === 'daily'      → per-date deterministic track + per-date localStorage state
 *   mode === 'unlimited'  → random track, streak/stats, "play again" button
 */
export function useAudioGuess({ mode }) {
  const isUnlimited = mode === 'unlimited'
  const todayKey = getTodayKey()

  const [track, setTrack] = useState(null)
  const [state, setState] = useState(null)
  const [stats, setStats] = useState(() =>
    isUnlimited ? resolveUnlimitedStats() : null
  )
  const [input, setInput] = useState('')
  const [toast, setToast] = useState(null)
  const [shake, setShake] = useState(false)

  const initialisedRef = useRef(false)
  const recentRef = useRef(isUnlimited ? readUnlimitedRecent() : [])
  const dailyTrack = useMemo(() => pickDailyTrack(todayKey), [todayKey])

  useEffect(() => {
    if (initialisedRef.current) return
    if (isUnlimited) {
      const picked = pickUnlimitedTrack({
        recentIds: recentRef.current,
        excludeIds: dailyTrack ? [dailyTrack.id] : [],
      })
      if (!picked) return
      setTrack(picked)
      setState(defaultState(picked.id))
      initialisedRef.current = true
      return
    }
    if (!dailyTrack) return
    const saved = loadDailyState(todayKey, dailyTrack.id)
    if (saved) {
      setTrack(dailyTrack)
      setState(saved)
    } else {
      setTrack(dailyTrack)
      setState({ ...defaultState(dailyTrack.id, todayKey) })
    }
    initialisedRef.current = true
  }, [isUnlimited, dailyTrack, todayKey])

  const playing = state?.status === 'playing'
  const won = state?.status === 'won'
  const lost = state?.status === 'lost'
  const gameOver = won || lost
  const wrongCount = state?.guesses?.filter((g) => !isCorrect(g, track)).length || 0
  const triesLeft = MAX_GUESSES - wrongCount

  const revealStage = gameOver
    ? REVEAL_LENGTHS.length - 1
    : Math.min(wrongCount, REVEAL_LENGTHS.length - 1)
  const revealSeconds = REVEAL_LENGTHS[revealStage]

  const persistDaily = useCallback((next) => {
    setState(next)
    if (!isUnlimited) saveDailyState(next)
  }, [isUnlimited])

  const pushRecent = useCallback((id) => {
    if (!id || !isUnlimited) return
    const next = [id, ...recentRef.current.filter((x) => x !== id)].slice(
      0,
      RECENT_LIMIT
    )
    recentRef.current = next
    writeUnlimitedRecent(next)
  }, [isUnlimited])

  const recordUnlimitedOutcome = useCallback((outcome) => {
    if (!isUnlimited) return
    setStats((prev) => {
      const base = prev || { played: 0, wins: 0, streak: 0, bestStreak: 0 }
      const isWin = outcome === 'won'
      const nextStreak = isWin ? base.streak + 1 : 0
      const next = {
        played: base.played + 1,
        wins: base.wins + (isWin ? 1 : 0),
        streak: nextStreak,
        bestStreak: Math.max(base.bestStreak, nextStreak),
      }
      writeUnlimitedStats(next)
      return next
    })
    writeUnlimitedPending(false)
  }, [isUnlimited])

  function showWrongToast() {
    setToast('Not quite — clip extended')
    setTimeout(() => setToast(null), 2200)
  }

  function handleGuess() {
    if (!input.trim() || !playing || !state || !track) return
    const guess = input.trim()

    if (state.guesses.some((g) => normalizeAnswer(g) === normalizeAnswer(guess))) {
      setToast('Already guessed')
      setTimeout(() => setToast(null), 1800)
      return
    }

    if (isCorrect(guess, track)) {
      const next = {
        ...state,
        guesses: [...state.guesses, guess],
        status: 'won',
      }
      persistDaily(next)
      setInput('')
      setToast(null)
      if (isUnlimited) {
        pushRecent(track.id)
        recordUnlimitedOutcome('won')
      }
      return
    }

    const nextGuesses = [...state.guesses, guess]
    if (nextGuesses.length >= MAX_GUESSES) {
      const next = { ...state, guesses: nextGuesses, status: 'lost' }
      persistDaily(next)
      setToast(null)
      if (isUnlimited) {
        pushRecent(track.id)
        recordUnlimitedOutcome('lost')
      }
    } else {
      const next = { ...state, guesses: nextGuesses }
      if (isUnlimited) writeUnlimitedPending(true)
      persistDaily(next)
      showWrongToast()
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
    setInput('')
  }

  function handleSkip() {
    if (!playing || !state || !track) return
    const nextGuesses = [...state.guesses, '— skipped —']
    if (nextGuesses.length >= MAX_GUESSES) {
      const next = { ...state, guesses: nextGuesses, status: 'lost' }
      persistDaily(next)
      if (isUnlimited) {
        pushRecent(track.id)
        recordUnlimitedOutcome('lost')
      }
    } else {
      const next = { ...state, guesses: nextGuesses }
      if (isUnlimited) writeUnlimitedPending(true)
      persistDaily(next)
      setToast('Skipped — clip extended')
      setTimeout(() => setToast(null), 2200)
    }
  }

  const playAgain = useCallback(() => {
    if (!isUnlimited) return
    const picked = pickUnlimitedTrack({
      recentIds: recentRef.current,
      currentId: track?.id || null,
      excludeIds: dailyTrack ? [dailyTrack.id] : [],
    })
    if (!picked) return
    setTrack(picked)
    setState(defaultState(picked.id))
    setInput('')
    setToast(null)
    writeUnlimitedPending(false)
  }, [isUnlimited, track, dailyTrack])

  const markTracked = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.tracked) return prev
      const next = { ...prev, tracked: true }
      if (!isUnlimited) saveDailyState(next)
      return next
    })
  }, [isUnlimited])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && playing) handleGuess()
  }

  return {
    mode: isUnlimited ? 'unlimited' : 'daily',
    track,
    state,
    stats,
    input,
    setInput,
    toast,
    shake,
    playing,
    won,
    lost,
    gameOver,
    wrongCount,
    triesLeft,
    revealStage,
    revealSeconds,
    maxGuesses: MAX_GUESSES,
    handleGuess,
    handleSkip,
    handleKeyDown,
    playAgain,
    markTracked,
    todayKey,
  }
}
