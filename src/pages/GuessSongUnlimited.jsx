import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import GameShell from '@/components/GameShell'
import GameSteps from '@/components/games/GameSteps'
import DailyGuessPlay from '@/components/daily/DailyGuessPlay'
import UnlimitedGuessComplete from '@/components/daily/UnlimitedGuessComplete'
import GuessModeToggle from '@/components/daily/GuessModeToggle'
import { fetchDailySongPool, getDailyPuzzle } from '@/services/skzDaily'
import { useUnlimitedGuessGame } from '@/hooks/useUnlimitedGuessGame'
import { getTodayKey } from '@/utils/dailyPuzzle'
import {
  trackUnlimitedRoundComplete,
  trackUnlimitedRoundStart,
} from '@/services/skzAnalytics'
import { absoluteSiteUrl } from '@/data/site'
import styles from '@/styles/DailyGuess.module.css'
import gameStyles from '@/styles/GamePage.module.css'

const ACCENT = '#a855f7'
const HOW_TO = [
  'Solve a random song clue — wrong guesses unlock more hints.',
  'Type the song title in English and press Guess.',
  'Hit “Play another puzzle” after each round. Today’s daily song is skipped.',
]

export default function GuessSongUnlimited() {
  const todayKey = getTodayKey()
  const [pool, setPool] = useState(null)
  const [todaysDailyId, setTodaysDailyId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    trackUnlimitedRoundStart('guess-song')
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchDailySongPool(), getDailyPuzzle(todayKey)]).then(
      ([poolResult, dailyResult]) => {
        if (cancelled) return
        setPool(poolResult)
        setTodaysDailyId(dailyResult?.id ?? null)
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [todayKey])

  const game = useUnlimitedGuessGame({
    pool: pool ?? [],
    excludeIds: todaysDailyId ? [todaysDailyId] : [],
    storageGame: 'song',
    trackId: 'guess-song-unlimited',
  })

  const lastResolvedRound = useRef(null)
  useEffect(() => {
    if (!game.puzzle || !game.gameOver) return
    const stamp = `${game.puzzle.id}:${game.state?.status}`
    if (lastResolvedRound.current === stamp) return
    lastResolvedRound.current = stamp
    trackUnlimitedRoundComplete('guess-song', {
      status: game.state?.status,
      streak: game.stats?.streak,
    })
  }, [game.puzzle, game.gameOver, game.state, game.stats])

  if (loading || !game.puzzle || !game.state) {
    return (
      <div className={gameStyles.loadingCenter}>
        <Loader2 size={28} className={gameStyles.spin} />
        <p>Loading…</p>
      </div>
    )
  }

  const headerActions = (
    <div className={styles.headerActionsStack}>
      <GuessModeToggle
        dailyHref="/guess-song"
        unlimitedHref="/guess-song/unlimited"
        mode="unlimited"
      />
      <GameSteps steps={HOW_TO} variant="header" />
    </div>
  )

  return (
    <GameShell
      fullWidth
      emoji="🎵"
      accent={ACCENT}
      title="Song Guess — Unlimited"
      subtitle="Endless random song clues. Today’s daily track is excluded so you can play both."
      meta={
        <>
          <span>Unlimited mode</span>
          <a href={absoluteSiteUrl('/guess-song/unlimited')} className={styles.metaLink}>
            skzarcade.com/guess-song/unlimited
          </a>
        </>
      }
      headerActions={headerActions}
    >
      {game.gameOver ? (
        <UnlimitedGuessComplete
          puzzle={game.puzzle}
          state={game.state}
          maxGuesses={game.maxGuesses}
          stats={game.stats}
          onPlayAgain={game.playAgain}
          dailyHref="/guess-song"
          kind="song"
        />
      ) : (
        <DailyGuessPlay
          state={game.state}
          puzzle={game.puzzle}
          maxGuesses={game.maxGuesses}
          hintLadder={game.hintLadder}
          placeholder="Enter song title…"
          accent={ACCENT}
          triesLeft={game.triesLeft}
          playing={game.playing}
          toast={game.toast}
          shake={game.shake}
          input={game.input}
          onInputChange={game.setInput}
          onKeyDown={game.handleKeyDown}
          onGuess={game.handleGuess}
          mode="unlimited"
          stats={game.stats}
        />
      )}
    </GameShell>
  )
}
