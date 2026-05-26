import { useState, useEffect, useMemo, useRef } from 'react'
import { trackGameComplete, trackGameStart } from '@/services/skzAnalytics'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import GameShell from '../components/GameShell'
import GameSteps from '../components/games/GameSteps'
import GuessSlots from '../components/GuessSlots'
import HintPanel from '../components/HintPanel'
import DailyGuessComplete from '../components/guess-song/DailyGuessComplete'
import GuessModeToggle from '../components/daily/GuessModeToggle'
import GuessHistoryList from '../components/daily/GuessHistoryList'
import { useSkzData } from '../context/SkzDataContext'
import { getDailyPuzzle } from '../services/skzDaily'
import { absoluteSiteUrl } from '@/data/site'
import { useMidnightCountdown } from '@/hooks/useMidnightCountdown'
import {
  getTodayKey,
  loadDailyState,
  saveDailyState,
  createInitialState,
  isAnswerCorrect,
  getHintLadder,
} from '../utils/dailyPuzzle'
import styles from '../styles/DailyGuess.module.css'
import gameStyles from '../styles/GamePage.module.css'

const HOW_TO_STEPS = (maxGuesses) => [
  'Check the clue in the center — more unlock after each wrong guess.',
  'Type the song title in English and press Guess.',
  `You have ${maxGuesses} tries. Everyone gets the same puzzle today.`,
]

export default function GuessSong() {
  const { settings } = useSkzData()
  const maxGuesses = parseInt(settings?.max_daily_guesses || '5', 10)
  const todayKey = getTodayKey()

  const [puzzle, setPuzzle] = useState(null)
  const [loadingPuzzle, setLoadingPuzzle] = useState(true)
  const [state, setState] = useState(null)
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const [toast, setToast] = useState(null)
  const countdown = useMidnightCountdown()

  useEffect(() => {
    trackGameStart('guess-song')
  }, [])

  const completedRef = useRef(false)
  useEffect(() => {
    if (!state || completedRef.current) return
    if (state.status !== 'won' && state.status !== 'lost') return
    if (state.tracked) {
      completedRef.current = true
      return
    }
    completedRef.current = true
    trackGameComplete('guess-song', { status: state.status })
    const trackedState = { ...state, tracked: true }
    setState(trackedState)
    saveDailyState(trackedState)
  }, [state])

  useEffect(() => {
    let cancelled = false
    getDailyPuzzle(todayKey).then((p) => {
      if (!cancelled) {
        setPuzzle(p)
        setLoadingPuzzle(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [todayKey])

  useEffect(() => {
    if (!puzzle) return
    const saved = loadDailyState(todayKey)
    if (saved && saved.puzzleId === puzzle.id) {
      setState(saved)
    } else {
      setState(createInitialState(puzzle))
    }
  }, [puzzle, todayKey])

  const wrongCount = useMemo(() => {
    if (!puzzle || !state?.guesses?.length) return 0
    return state.guesses.filter((guess) => !isAnswerCorrect(guess, puzzle)).length
  }, [puzzle, state])
  const playing = state?.status === 'playing'
  const won = state?.status === 'won'
  const lost = state?.status === 'lost'
  const gameOver = won || lost
  const triesLeft = maxGuesses - wrongCount

  const hintLadder = useMemo(
    () =>
      puzzle && state
        ? getHintLadder(puzzle, wrongCount, false)
        : [],
    [puzzle, wrongCount, state]
  )

  function persist(next) {
    setState(next)
    saveDailyState(next)
  }

  function showWrongToast(missCount) {
    const nextReveal = puzzle?.reveals?.[missCount]
    setToast(
      nextReveal
        ? `${nextReveal.label || 'Clue'} unlocked`
        : 'Not quite'
    )
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

  if (loadingPuzzle) {
    return (
      <div className={gameStyles.loadingCenter}>
        <Loader2 size={28} className={gameStyles.spin} />
        <p>Loading…</p>
      </div>
    )
  }

  if (!puzzle || !state) {
    return (
      <div className={gameStyles.loadingCenter}>
        <p>Could not load today&apos;s puzzle. Try again later.</p>
      </div>
    )
  }

  const headerActions = (
    <div className={styles.headerActionsStack}>
      <GuessModeToggle
        dailyHref="/guess-song"
        unlimitedHref="/guess-song/unlimited"
        mode="daily"
      />
      <GameSteps steps={HOW_TO_STEPS(maxGuesses)} variant="header" />
    </div>
  )

  return (
    <GameShell
      fullWidth
      emoji="🎵"
      accent="#a855f7"
      title="Daily Song Guess"
      subtitle="Everyone gets the same track today. Wrong guesses unlock the next clue."
      meta={
        <>
          <span>Puzzle · {todayKey}</span>
          <a href={absoluteSiteUrl('/guess-song')} className={styles.metaLink}>
            skzarcade.com/guess-song
          </a>
        </>
      }
      headerActions={headerActions}
    >
      {gameOver ? (
        <DailyGuessComplete
          puzzle={puzzle}
          state={state}
          maxGuesses={maxGuesses}
          todayKey={todayKey}
          countdown={countdown}
          unlimitedHref="/guess-song/unlimited"
        />
      ) : (
        <div
          className={`${gameStyles.panel} ${styles.board}`}
          style={{ '--game-accent': '#a855f7' }}
        >
          <div className={styles.topBar}>
            <div className={styles.triesBlock}>
              <p className={styles.triesLabel}>Tries</p>
              <GuessSlots
                guesses={state.guesses}
                max={maxGuesses}
                status={state.status}
                showLabel={!playing}
              />
              {playing && (
                <span className={styles.tilesLabel}>{triesLeft} left</span>
              )}
            </div>
            <div className={styles.timerBlock}>
              <p className={styles.timerLabel}>Next puzzle</p>
              <p className={styles.timerValue}>{countdown}</p>
              <p className={styles.puzzleDate}>Resets at midnight</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key="play"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <HintPanel ladder={hintLadder} variant="stage" />

              <div
                className={`${styles.playGrid} ${
                  state.guesses.length === 0 ? styles.playGridNoLog : ''
                }`}
              >
                <div className={styles.playMain}>
                  {toast && <p className={styles.toast}>{toast}</p>}

                  <div className={styles.guessSection}>
                    <p className={gameStyles.sectionLabel}>Your guess</p>
                    <motion.div
                      className={styles.inputRow}
                      animate={shake ? { x: [-4, 4, 0] } : {}}
                    >
                      <input
                        id="daily-answer"
                        type="text"
                        className={gameStyles.input}
                        placeholder="Enter song title…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoComplete="off"
                        autoFocus
                      />
                      <button
                        type="button"
                        className={`${gameStyles.btn} ${gameStyles.btnPrimary}`}
                        onClick={handleGuess}
                        disabled={!input.trim()}
                      >
                        Guess
                      </button>
                    </motion.div>
                  </div>
                </div>

                {state.guesses.length > 0 && (
                  <GuessHistoryList
                    guesses={state.guesses}
                    puzzle={puzzle}
                    title="Past guesses"
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </GameShell>
  )
}
