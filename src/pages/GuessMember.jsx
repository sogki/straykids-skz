import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import GameShell from '@/components/GameShell'
import GameSteps from '@/components/games/GameSteps'
import DailyGuessPlay from '@/components/daily/DailyGuessPlay'
import DailyGuessComplete from '@/components/guess-song/DailyGuessComplete'
import { dailyMembers } from '@/data/dailyMembers'
import { getMemberQuestionMeta } from '@/data/memberQuestionTypes'
import { useDailyGuessGame } from '@/hooks/useDailyGuessGame'
import { absoluteSiteUrl } from '@/data/site'
import { trackGameComplete, trackGameStart } from '@/services/skzAnalytics'
import styles from '@/styles/DailyGuess.module.css'
import gameStyles from '@/styles/GamePage.module.css'

const ACCENT = '#f472b6'
const HOW_TO = [
  'Read today’s question — wrong guesses unlock more clues.',
  'Type a member’s name in English (e.g. Bang Chan, Felix).',
  'Everyone gets the same question each day. New one at midnight.',
]

export default function GuessMember() {
  const game = useDailyGuessGame({
    pool: dailyMembers,
    storageGame: 'member',
    trackId: 'guess-member',
  })

  const completedRef = useRef(false)

  useEffect(() => {
    trackGameStart('guess-member')
  }, [])

  useEffect(() => {
    if (!game.state || completedRef.current) return
    if (game.state.status === 'won' || game.state.status === 'lost') {
      completedRef.current = true
      trackGameComplete('guess-member', { status: game.state.status })
    }
  }, [game.state])

  const questionMeta = game.puzzle
    ? getMemberQuestionMeta(game.puzzle.questionType)
    : null

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
      emoji="🎭"
      accent={ACCENT}
      title="Daily Member Guess"
      subtitle="Quotes, song roles, units, and vibes — name the right member in 5 tries."
      meta={
        <>
          <span>Puzzle · {game.todayKey}</span>
          <a href={absoluteSiteUrl('/guess-member')} className={styles.metaLink}>
            skzarcade.com/guess-member
          </a>
        </>
      }
      headerActions={<GameSteps steps={HOW_TO} variant="header" />}
    >
      {game.gameOver ? (
        <DailyGuessComplete
          puzzle={game.puzzle}
          state={game.state}
          maxGuesses={game.maxGuesses}
          todayKey={game.todayKey}
          countdown={game.countdown}
          kind="member"
        />
      ) : (
        <DailyGuessPlay
          state={game.state}
          maxGuesses={game.maxGuesses}
          countdown={game.countdown}
          hintLadder={game.hintLadder}
          questionBadge={
            questionMeta
              ? `${questionMeta.emoji} ${questionMeta.label}`
              : null
          }
          placeholder="Enter member name…"
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
