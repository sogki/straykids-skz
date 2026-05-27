import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Flame,
  Infinity as InfinityIcon,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react'
import GuessHistoryList from '@/components/daily/GuessHistoryList'
import { isAnswerCorrect } from '@/utils/dailyPuzzle'
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

  const eyebrow =
    kind === 'member'
      ? 'Unlimited member'
      : kind === 'lyric'
        ? 'Unlimited lyric'
        : 'Unlimited track'

  const subline =
    kind === 'lyric' && puzzle.song
      ? `From “${puzzle.song}”`
      : kind === 'member' && puzzle.prompt
        ? puzzle.prompt
        : null

  const winText =
    state.guesses.length === 1
      ? 'First-try solve'
      : `Solved in ${state.guesses.length} of ${maxGuesses}`

  const loseText =
    kind === 'lyric'
      ? `You used all ${maxGuesses} tries — the word was “${answer}”.`
      : `You used all ${maxGuesses} tries.`

  return (
    <div className={styles.completedScreen}>
      <div className={styles.answerHero}>
        <span
          className={`${styles.statusPill} ${
            won ? styles.statusPillWon : styles.statusPillLost
          }`}
        >
          {won ? (
            <CheckCircle2 size={14} aria-hidden="true" />
          ) : (
            <XCircle size={14} aria-hidden="true" />
          )}
          {won ? 'Got it' : 'Out of tries'}
        </span>

        <p className={styles.answerEyebrow}>
          <InfinityIcon size={12} aria-hidden="true" />
          <span style={{ marginLeft: '0.25rem' }}>{eyebrow}</span>
        </p>
        <h2 className={styles.answerHeadline}>{answer}</h2>
        {subline && <p className={styles.answerSubline}>{subline}</p>}
        <p className={won ? styles.answerSubline : styles.answerLoseLead}>
          {won ? winText : loseText}
        </p>

        <ul className={styles.tryDotsRow} aria-label="Guess history">
          {Array.from({ length: maxGuesses }).map((_, i) => {
            const guess = state.guesses[i]
            const filled = i < state.guesses.length
            const correct = filled && isAnswerCorrect(guess, puzzle)
            let cls = ''
            if (filled) {
              cls = correct ? styles.tryDotShellCorrect : styles.tryDotShellWrong
            }
            return (
              <li
                key={i}
                className={`${styles.tryDotShell} ${cls}`}
                aria-label={
                  !filled ? 'Unused' : correct ? 'Correct' : 'Wrong'
                }
              />
            )
          })}
        </ul>
      </div>

      {state.guesses.length > 0 && (
        <GuessHistoryList
          guesses={state.guesses}
          puzzle={puzzle}
          title="Your guesses"
        />
      )}

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
