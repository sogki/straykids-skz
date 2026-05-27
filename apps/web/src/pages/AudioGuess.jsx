import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import GameShell from '@/components/GameShell'
import GameSteps from '@/components/games/GameSteps'
import GuessModeToggle from '@/components/daily/GuessModeToggle'
import AudioGuessIntro from '@/components/audio-guess/AudioGuessIntro'
import AudioGuessPlay from '@/components/audio-guess/AudioGuessPlay'
import AudioGuessComplete from '@/components/audio-guess/AudioGuessComplete'
import { useAudioGuess, MAX_GUESSES } from '@/hooks/useAudioGuess'
import { useMidnightCountdown } from '@/hooks/useMidnightCountdown'
import { audioGameTracks } from '@/data/audioGameTracks'
import { absoluteSiteUrl } from '@/data/site'
import { trackGameComplete, trackGameStart } from '@/services/skzAnalytics'
import styles from '@/styles/AudioGuess.module.css'
import gameStyles from '@/styles/GamePage.module.css'

const ACCENT = '#fb7185'

const HOW_TO = [
  'Hit play to hear a 2-second snippet of the day’s track.',
  `Each wrong guess unlocks more audio. You get ${MAX_GUESSES} tries.`,
  'Same track for every STAY today — come back tomorrow for a new one.',
]

const INTRO_KEY = 'skz-audio-daily-intro-seen'

function readIntroSeen(dateKey) {
  try {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(`${INTRO_KEY}-${dateKey}`) === '1'
  } catch {
    return false
  }
}

function writeIntroSeen(dateKey) {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(`${INTRO_KEY}-${dateKey}`, '1')
  } catch {
    /* ignore */
  }
}

export default function AudioGuess() {
  const game = useAudioGuess({ mode: 'daily' })
  const countdown = useMidnightCountdown()
  const [introDismissed, setIntroDismissed] = useState(false)

  useEffect(() => {
    trackGameStart('audio-guess')
  }, [])

  useEffect(() => {
    if (!game.state) return
    if (readIntroSeen(game.todayKey)) setIntroDismissed(true)
  }, [game.todayKey, game.state])

  const completedRef = useRef(false)
  useEffect(() => {
    if (!game.state || completedRef.current) return
    if (!game.gameOver) return
    if (game.state.tracked) {
      completedRef.current = true
      return
    }
    completedRef.current = true
    trackGameComplete('audio-guess', { status: game.state.status })
    game.markTracked()
  }, [game])

  if (!audioGameTracks.length) {
    return (
      <div className={gameStyles.loadingCenter}>
        <p>Audio pool not built yet. Run the fetcher to populate tracks.</p>
      </div>
    )
  }

  if (!game.track || !game.state) {
    return (
      <div className={gameStyles.loadingCenter}>
        <Loader2 size={28} className={gameStyles.spin} />
        <p>Loading today’s track…</p>
      </div>
    )
  }

  const showIntro =
    !introDismissed && game.state.guesses.length === 0 && !game.gameOver

  function handleStart() {
    writeIntroSeen(game.todayKey)
    setIntroDismissed(true)
  }

  const headerActions = (
    <div className={styles.headerActionsStack}>
      <GuessModeToggle
        dailyHref="/audio-guess"
        unlimitedHref="/audio-guess/unlimited"
        mode="daily"
      />
      <GameSteps steps={HOW_TO} variant="header" />
    </div>
  )

  return (
    <GameShell
      fullWidth
      emoji="🎧"
      accent={ACCENT}
      title="Audio Guess"
      subtitle="Same Stray Kids snippet for every STAY today. Wrong guesses extend the clip."
      meta={
        <>
          <span>Puzzle · {game.todayKey}</span>
          <a href={absoluteSiteUrl('/audio-guess')} className={styles.metaLink}>
            skzarcade.com/audio-guess
          </a>
        </>
      }
      headerActions={headerActions}
    >
      {showIntro ? (
        <AudioGuessIntro
          mode="daily"
          trackCount={audioGameTracks.length}
          onStart={handleStart}
        />
      ) : game.gameOver ? (
        <AudioGuessComplete
          mode="daily"
          track={game.track}
          state={game.state}
          countdown={countdown}
          unlimitedHref="/audio-guess/unlimited"
        />
      ) : (
        <AudioGuessPlay
          track={game.track}
          state={game.state}
          input={game.input}
          setInput={game.setInput}
          toast={game.toast}
          shake={game.shake}
          triesLeft={game.triesLeft}
          wrongCount={game.wrongCount}
          revealSeconds={game.revealSeconds}
          maxGuesses={game.maxGuesses}
          onGuess={game.handleGuess}
          onKeyDown={game.handleKeyDown}
          onSkip={game.handleSkip}
        />
      )}
    </GameShell>
  )
}
