import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import GameShell from '@/components/GameShell'
import GameSteps from '@/components/games/GameSteps'
import DailyGuessPlay from '@/components/daily/DailyGuessPlay'
import UnlimitedGuessComplete from '@/components/daily/UnlimitedGuessComplete'
import GuessModeToggle from '@/components/daily/GuessModeToggle'
import { dailyMembers as fallbackPool } from '@/data/dailyMembers'
import { fetchDailyMemberPool, getDailyMemberPuzzle } from '@/services/skzDaily'
import { getMemberQuestionMeta } from '@/data/memberQuestionTypes'
import { useUnlimitedGuessGame } from '@/hooks/useUnlimitedGuessGame'
import { getTodayKey } from '@/utils/dailyPuzzle'
import { trackGameComplete, trackGameStart } from '@/services/skzAnalytics'
import { absoluteSiteUrl } from '@/data/site'
import styles from '@/styles/DailyGuess.module.css'
import gameStyles from '@/styles/GamePage.module.css'

const ACCENT = '#f472b6'
const HOW_TO = [
  'Each round is a random member question — quotes, roles, units, vibes.',
  'Type the member’s English name (e.g. Bang Chan, Felix).',
  'Today’s daily question is skipped so unlimited never repeats the daily.',
]

export default function GuessMemberUnlimited() {
  const todayKey = getTodayKey()
  const [pool, setPool] = useState(null)
  const [todaysDailyId, setTodaysDailyId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    trackGameStart('guess-member-unlimited')
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchDailyMemberPool().catch(() => fallbackPool),
      getDailyMemberPuzzle(todayKey),
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
    storageGame: 'member',
    trackId: 'guess-member-unlimited',
  })

  const lastResolvedRound = useRef(null)
  useEffect(() => {
    if (!game.puzzle || !game.gameOver) return
    const stamp = `${game.puzzle.id}:${game.state?.status}`
    if (lastResolvedRound.current === stamp) return
    lastResolvedRound.current = stamp
    trackGameComplete('guess-member-unlimited', {
      status: game.state?.status,
      streak: game.stats?.streak,
    })
  }, [game.puzzle, game.gameOver, game.state, game.stats])

  const questionMeta = game.puzzle
    ? getMemberQuestionMeta(game.puzzle.questionType)
    : null

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
        dailyHref="/guess-member"
        unlimitedHref="/guess-member/unlimited"
        mode="unlimited"
      />
      <GameSteps steps={HOW_TO} variant="header" />
    </div>
  )

  return (
    <GameShell
      fullWidth
      emoji="🎭"
      accent={ACCENT}
      title="Member Guess — Unlimited"
      subtitle="Endless random member questions. Today’s daily is excluded."
      meta={
        <>
          <span>Unlimited mode</span>
          <a href={absoluteSiteUrl('/guess-member/unlimited')} className={styles.metaLink}>
            skzarcade.com/guess-member/unlimited
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
          dailyHref="/guess-member"
          kind="member"
        />
      ) : (
        <DailyGuessPlay
          state={game.state}
          maxGuesses={game.maxGuesses}
          hintLadder={game.hintLadder}
          questionBadge={
            questionMeta ? `${questionMeta.emoji} ${questionMeta.label}` : null
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
          mode="unlimited"
          stats={game.stats}
        />
      )}
    </GameShell>
  )
}
