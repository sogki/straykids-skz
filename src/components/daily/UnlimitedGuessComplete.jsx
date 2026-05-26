import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Flame,
  Infinity as InfinityIcon,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react'
import GuessSlots from '@/components/GuessSlots'
import styles from '@/styles/DailyGuess.module.css'
import gameStyles from '@/styles/GamePage.module.css'

export default function UnlimitedGuessComplete({
  puzzle,
  state,
  maxGuesses,
  stats,
  onPlayAgain,
  dailyHref,
  kind = 'song',
}) {
  const won = state.status === 'won'
  const answer = puzzle.displayAnswer || puzzle.answers[0]

  const winRate = stats.played
    ? Math.round((stats.wins / stats.played) * 100)
    : 0

  const loseLead =
    kind === 'member'
      ? `It was ${answer}.`
      : kind === 'lyric'
        ? `The word was “${answer}”${puzzle.song ? ` (${puzzle.song})` : ''}.`
        : `The answer was ${answer}.`

  const winLead =
    kind === 'member'
      ? `Correct — ${answer} in ${state.guesses.length} of ${maxGuesses} tries.`
      : kind === 'lyric'
        ? `You filled the blank in ${state.guesses.length} of ${maxGuesses} tries.`
        : `Nice work — you found the song in ${state.guesses.length} of ${maxGuesses} tries.`

  return (
    <div className={styles.completedScreen}>
      <div className={styles.completedHero}>
        <div
          className={`${styles.completedIcon} ${
            won ? styles.completedIconWin : styles.completedIconLoss
          }`}
          aria-hidden="true"
        >
          {won ? (
            <CheckCircle2 size={32} strokeWidth={2.25} />
          ) : (
            <XCircle size={32} strokeWidth={2.25} />
          )}
        </div>

        <p className={styles.completedKicker}>
          <InfinityIcon size={12} aria-hidden="true" />
          <span>Unlimited round</span>
        </p>
        <h2 className={styles.completedTitle}>
          {won ? 'Solved!' : 'Out of tries'}
        </h2>
        <p className={styles.completedLead}>
          {won ? winLead : loseLead} Ready for another?
        </p>

        <div className={styles.completedMeta}>
          <GuessSlots
            guesses={state.guesses}
            max={maxGuesses}
            status={state.status}
            showLabel
          />
        </div>
      </div>

      <div className={styles.unlimitedStats}>
        <div className={styles.unlimitedStat}>
          <Flame size={16} aria-hidden="true" />
          <div>
            <p className={styles.unlimitedStatValue}>{stats.streak}</p>
            <p className={styles.unlimitedStatLabel}>Streak</p>
          </div>
        </div>
        <div className={styles.unlimitedStat}>
          <Trophy size={16} aria-hidden="true" />
          <div>
            <p className={styles.unlimitedStatValue}>{stats.bestStreak}</p>
            <p className={styles.unlimitedStatLabel}>Best streak</p>
          </div>
        </div>
        <div className={styles.unlimitedStat}>
          <CheckCircle2 size={16} aria-hidden="true" />
          <div>
            <p className={styles.unlimitedStatValue}>
              {stats.wins}/{stats.played}
            </p>
            <p className={styles.unlimitedStatLabel}>
              {winRate}% solve rate
            </p>
          </div>
        </div>
      </div>

      <div className={styles.unlimitedActions}>
        <button
          type="button"
          className={`${gameStyles.btn} ${gameStyles.btnPrimary}`}
          onClick={onPlayAgain}
          autoFocus
        >
          <RotateCcw size={16} aria-hidden="true" />
          Play another puzzle
        </button>
        {dailyHref && (
          <Link
            to={dailyHref}
            className={`${gameStyles.btn} ${gameStyles.btnSecondary}`}
          >
            Back to daily
          </Link>
        )}
      </div>
    </div>
  )
}
