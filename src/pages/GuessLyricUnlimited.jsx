import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import GameShell from '@/components/GameShell'
import GameSteps from '@/components/games/GameSteps'
import DailyGuessPlay from '@/components/daily/DailyGuessPlay'
import UnlimitedGuessComplete from '@/components/daily/UnlimitedGuessComplete'
import GuessModeToggle from '@/components/daily/GuessModeToggle'
import { dailyLyrics as fallbackPool } from '@/data/dailyLyrics'
import { fetchDailyLyricPool, getDailyLyricPuzzle } from '@/services/skzDaily'
import { useUnlimitedGuessGame } from '@/hooks/useUnlimitedGuessGame'
import { getTodayKey } from '@/utils/dailyPuzzle'
import { trackGameComplete, trackGameStart } from '@/services/skzAnalytics'
import { absoluteSiteUrl } from '@/data/site'
import styles from '@/styles/DailyGuess.module.css'
import gameStyles from '@/styles/GamePage.module.css'

const ACCENT = '#38bdf8'
const HOW_TO = [
  'Read a random lyric with a blank — more clues unlock each miss.',
  'Type the missing word in English and press Guess.',
  'Today’s daily lyric is skipped so unlimited never repeats the daily.',
]

export default function GuessLyricUnlimited() {
  const todayKey = getTodayKey()
  const [pool, setPool] = useState(null)
  const [todaysDailyId, setTodaysDailyId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    trackGameStart('guess-lyric-unlimited')
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchDailyLyricPool().catch(() => fallbackPool),
      getDailyLyricPuzzle(todayKey),
    ]).then(([poolResult, dailyResult]) => {
      if (cancelled) return
      setPool(poolResult)
      setTodaysDailyId(dailyResult?.id ?? null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [todayKey])

  const game = useUnlimitedGuessGame({
    pool: pool ?? [],
    excludeIds: todaysDailyId ? [todaysDailyId] : [],
    storageGame: 'lyric',
    trackId: 'guess-lyric-unlimited',
  })

  const lastResolvedRound = useRef(null)
  useEffect(() => {
    if (!game.puzzle || !game.gameOver) return
    const stamp = `${game.puzzle.id}:${game.state?.status}`
    if (lastResolvedRound.current === stamp) return
    lastResolvedRound.current = stamp
    trackGameComplete('guess-lyric-unlimited', {
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
        dailyHref="/guess-lyric"
        unlimitedHref="/guess-lyric/unlimited"
        mode="unlimited"
      />
      <GameSteps steps={HOW_TO} variant="header" />
    </div>
  )

  return (
    <GameShell
      fullWidth
      emoji="📝"
      accent={ACCENT}
      title="Lyric Guess — Unlimited"
      subtitle="Endless random lyric blanks. Today’s daily is excluded."
      meta={
        <>
          <span>Unlimited mode</span>
          <a href={absoluteSiteUrl('/guess-lyric/unlimited')} className={styles.metaLink}>
            skzarcade.com/guess-lyric/unlimited
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
          dailyHref="/guess-lyric"
          kind="lyric"
        />
      ) : (
        <DailyGuessPlay
          state={game.state}
          maxGuesses={game.maxGuesses}
          hintLadder={game.hintLadder}
          placeholder="Missing word…"
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
