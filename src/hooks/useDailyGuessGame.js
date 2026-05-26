import { useEffect, useMemo, useState } from 'react'
import { useMidnightCountdown } from '@/hooks/useMidnightCountdown'
import {
  createInitialState,
  getDailyPuzzleFromPool,
  getHintLadder,
  getTodayKey,
  isAnswerCorrect,
  loadDailyState,
  saveDailyState,
} from '@/utils/dailyPuzzle'

/**
 * Shared daily guess loop (song / member / lyric).
 */
export function useDailyGuessGame({ pool, puzzle: puzzleProp, storageGame, trackId }) {
  const todayKey = getTodayKey()
  const maxGuesses = 5

  const [puzzle, setPuzzle] = useState(puzzleProp ?? null)
  const [state, setState] = useState(null)
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const [toast, setToast] = useState(null)
  const countdown = useMidnightCountdown()

  useEffect(() => {
    if (puzzleProp) {
      setPuzzle(puzzleProp)
      return
    }
    if (!pool?.length) {
      setPuzzle(null)
      return
    }
    const p = getDailyPuzzleFromPool(pool, todayKey)
    setPuzzle(p)
  }, [pool, puzzleProp, todayKey])

  useEffect(() => {
    if (!puzzle) return
    const saved = loadDailyState(todayKey, storageGame)
    if (saved && saved.puzzleId === puzzle.id) {
      setState(saved)
    } else {
      setState(createInitialState(puzzle))
    }
  }, [puzzle, todayKey, storageGame])

  const wrongCount = useMemo(() => {
    if (!puzzle || !state?.guesses?.length) return 0
    return state.guesses.filter((guess) => !isAnswerCorrect(guess, puzzle)).length
  }, [puzzle, state])
  const playing = state?.status === 'playing'
  const won = state?.status === 'won'
  const lost = state?.status === 'lost'
  const gameOver = won || lost
  const triesLeft = maxGuesses - wrongCount

  const hintLadder = useMemo(() => {
    if (!puzzle || !state) return []
    return getHintLadder(puzzle, wrongCount, false)
  }, [puzzle, wrongCount, state])

  function persist(next) {
    setState(next)
    saveDailyState(next, storageGame)
  }

  function showWrongToast(missCount) {
    const nextReveal = puzzle?.reveals?.[missCount]
    setToast(nextReveal ? `${nextReveal.label || 'Clue'} unlocked` : 'Not quite')
    setTimeout(() => setToast(null), 2500)
  }

  function handleGuess() {
    if (!input.trim() || !playing || !state || !puzzle) return

    const guess = input.trim()
    if (state.guesses.some((g) => g.toLowerCase() === guess.toLowerCase())) {
      setToast('Already guessed')
      setTimeout(() => setToast(null), 2000)
      return
    }

    if (isAnswerCorrect(guess, puzzle)) {
      persist({
        ...state,
        guesses: [...state.guesses, guess],
        status: 'won',
      })
      setInput('')
      setToast(null)
      return
    }

    const nextGuesses = [...state.guesses, guess]
    if (nextGuesses.length >= maxGuesses) {
      persist({ ...state, guesses: nextGuesses, status: 'lost' })
      setToast(null)
    } else {
      persist({ ...state, guesses: nextGuesses })
      showWrongToast(nextGuesses.length)
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && playing) handleGuess()
  }

  return {
    todayKey,
    maxGuesses,
    puzzle,
    state,
    input,
    setInput,
    shake,
    toast,
    countdown,
    playing,
    won,
    lost,
    gameOver,
    triesLeft,
    hintLadder,
    handleGuess,
    handleKeyDown,
    trackId,
  }
}
