import { useEffect, useRef, useState } from 'react'
import GameShell from '@/components/GameShell'
import GameSteps from '@/components/games/GameSteps'
import GuessModeToggle from '@/components/daily/GuessModeToggle'
import AudioGuessIntro from '@/components/audio-guess/AudioGuessIntro'
import AudioGuessPlay from '@/components/audio-guess/AudioGuessPlay'
import AudioGuessComplete from '@/components/audio-guess/AudioGuessComplete'
import { useAudioGuess, MAX_GUESSES } from '@/hooks/useAudioGuess'
import { audioGameTracks } from '@/data/audioGameTracks'
import { absoluteSiteUrl } from '@/data/site'
import {
  trackUnlimitedRoundComplete,
  trackUnlimitedRoundStart,
} from '@/services/skzAnalytics'
import styles from '@/styles/AudioGuess.module.css'
import gameStyles from '@/styles/GamePage.module.css'

const ACCENT = '#fb7185'

const HOW_TO = [
  'Random Stray Kids snippet every round. Two-second start, growing with each miss.',
  `${MAX_GUESSES} guesses per track. Wrong answers extend the clip.`,
  'Streak resets if you refresh mid-round after a wrong guess.',
]

export default function AudioGuessUnlimited() {
  const game = useAudioGuess({ mode: 'unlimited' })
  const [introDismissed, setIntroDismissed] = useState(false)

  useEffect(() => {
    trackUnlimitedRoundStart('audio-guess')
  }, [])

  const lastResolvedRound = useRef(null)
  useEffect(() => {
    if (!game.track || !game.gameOver) return
    const stamp = `${game.track.id}:${game.state?.status}`
    if (lastResolvedRound.current === stamp) return
    lastResolvedRound.current = stamp
    trackUnlimitedRoundComplete('audio-guess', {
      status: game.state?.status,
      streak: game.stats?.streak,
    })
  }, [game.track, game.gameOver, game.state, game.stats])

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
        <p>Loading…</p>
      </div>
    )
  }

  const showIntro =
    !introDismissed && game.state.guesses.length === 0 && !game.gameOver && game.stats?.played === 0

  const headerActions = (
    <div className={styles.headerActionsStack}>
      <GuessModeToggle
        dailyHref="/audio-guess"
        unlimitedHref="/audio-guess/unlimited"
        mode="unlimited"
      />
      <GameSteps steps={HOW_TO} variant="header" />
    </div>
  )

  function handlePlayAgain() {
    lastResolvedRound.current = null
    game.playAgain()
    trackUnlimitedRoundStart('audio-guess')
  }

  return (
    <GameShell
      fullWidth
      emoji="🎧"
      accent={ACCENT}
      title="Audio Guess — Unlimited"
      subtitle="Random snippets back-to-back. Today’s daily track is excluded so you can play both."
      meta={
        <>
          <span>Unlimited mode</span>
          <a href={absoluteSiteUrl('/audio-guess/unlimited')} className={styles.metaLink}>
            skzarcade.com/audio-guess/unlimited
          </a>
        </>
      }
      headerActions={headerActions}
    >
      {showIntro ? (
        <AudioGuessIntro
          mode="unlimited"
          trackCount={audioGameTracks.length}
          onStart={() => setIntroDismissed(true)}
        />
      ) : game.gameOver ? (
        <AudioGuessComplete
          mode="unlimited"
          track={game.track}
          state={game.state}
          stats={game.stats}
          onPlayAgain={handlePlayAgain}
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
