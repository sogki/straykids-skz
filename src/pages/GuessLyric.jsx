import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import GameShell from '@/components/GameShell'
import GameSteps from '@/components/games/GameSteps'
import DailyGuessPlay from '@/components/daily/DailyGuessPlay'
import DailyGuessComplete from '@/components/guess-song/DailyGuessComplete'
import GuessModeToggle from '@/components/daily/GuessModeToggle'
import { dailyLyrics } from '@/data/dailyLyrics'
import { useDailyGuessGame } from '@/hooks/useDailyGuessGame'
import { absoluteSiteUrl } from '@/data/site'
import { trackGameComplete, trackGameStart } from '@/services/skzAnalytics'
import styles from '@/styles/DailyGuess.module.css'
import gameStyles from '@/styles/GamePage.module.css'

const ACCENT = '#38bdf8'
const HOW_TO = [
  'Read the lyric with a blank — more clues unlock after each wrong guess.',
  'Type the missing word in English and press Guess.',
  'You have 5 tries. Everyone gets the same lyric today.',
]

export default function GuessLyric() {
  const game = useDailyGuessGame({
    pool: dailyLyrics,
    storageGame: 'lyric',
    trackId: 'guess-lyric',
  })

  const completedRef = useRef(false)

  useEffect(() => {
    trackGameStart('guess-lyric')
  }, [])

  useEffect(() => {
    if (!game.state || completedRef.current) return
    if (game.state.status === 'won' || game.state.status === 'lost') {
      completedRef.current = true
      trackGameComplete('guess-lyric', { status: game.state.status })
    }
  }, [game.state])

  if (!game.puzzle || !game.state) {
    return (
      <div className={gameStyles.loadingCenter}>
        <Loader2 size={28} className={gameStyles.spin} />
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <GameShell
      fullWidth
      emoji="📝"
      accent={ACCENT}
      title="Daily Lyric Guess"
      subtitle="Everyone gets the same lyric today. Wrong guesses unlock the next clue."
      meta={
        <>
          <span>Puzzle · {game.todayKey}</span>
          <a href={absoluteSiteUrl('/guess-lyric')} className={styles.metaLink}>
            skzarcade.com/guess-lyric
          </a>
        </>
      }
      headerActions={
        <div className={styles.headerActionsStack}>
          <GuessModeToggle
            dailyHref="/guess-lyric"
            unlimitedHref="/guess-lyric/unlimited"
            mode="daily"
          />
          <GameSteps steps={HOW_TO} variant="header" />
        </div>
      }
    >
      {game.gameOver ? (
        <DailyGuessComplete
          puzzle={game.puzzle}
          state={game.state}
          maxGuesses={game.maxGuesses}
          todayKey={game.todayKey}
          countdown={game.countdown}
          kind="lyric"
          unlimitedHref="/guess-lyric/unlimited"
        />
      ) : (
        <DailyGuessPlay
          state={game.state}
          maxGuesses={game.maxGuesses}
          countdown={game.countdown}
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
        />
      )}
    </GameShell>
  )
}
