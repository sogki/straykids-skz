import { Check, X } from 'lucide-react'
import { isAnswerCorrect } from '@/utils/dailyPuzzle'
import styles from '@/styles/DailyGuess.module.css'

/**
 * Renders the user's full guess history with correctness markers.
 * Used in both the play screen (where everything is a miss) and the
 * complete screen (where the last item is the winning guess on a win).
 *
 * Props:
 *   - guesses    string[]    every guess in order
 *   - puzzle     object      puzzle with `.answers` array
 *   - title      string?     optional heading (defaults to "Your guesses")
 *   - emptyHint  string?     fallback text when guesses is empty (omit to render nothing)
 */
export default function GuessHistoryList({
  guesses,
  puzzle,
  title = 'Your guesses',
  emptyHint,
}) {
  if (!guesses?.length) {
    if (!emptyHint) return null
    return (
      <div className={styles.guessLog}>
        <p className={styles.guessLogTitle}>{title}</p>
        <p className={styles.guessLogEmpty}>{emptyHint}</p>
      </div>
    )
  }

  return (
    <div className={styles.guessLog}>
      <p className={styles.guessLogTitle}>{title}</p>
      <ul className={styles.guessList}>
        {guesses.map((g, i) => {
          const correct = isAnswerCorrect(g, puzzle)
          return (
            <li
              key={`${g}-${i}`}
              className={`${styles.guessListItem} ${
                correct ? styles.guessListItemCorrect : styles.guessListItemWrong
              }`}
            >
              <span className={styles.guessName}>{g}</span>
              <span
                className={
                  correct ? styles.guessMarkCorrect : styles.guessMarkWrong
                }
                aria-label={correct ? 'Correct' : 'Wrong'}
              >
                {correct ? (
                  <Check size={14} strokeWidth={3} aria-hidden="true" />
                ) : (
                  <X size={14} strokeWidth={3} aria-hidden="true" />
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
