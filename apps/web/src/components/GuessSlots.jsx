import styles from '../styles/DailyGuess.module.css'

/** Wordle-style attempt indicators */
export default function GuessSlots({ guesses, max, status, showLabel = true }) {
  const playing = status === 'playing'
  const won = status === 'won'

  return (
    <div className={styles.tiles} role="group" aria-label={`${guesses.length} of ${max} guesses`}>
      {Array.from({ length: max }).map((_, i) => {
        const used = i < guesses.length
        const isWin = won && used && i === guesses.length - 1
        const isWrong = used && !isWin
        const isCurrent = playing && i === guesses.length

        return (
          <div
            key={i}
            className={`${styles.tile} ${
              isWin
                ? styles.tileCorrect
                : isWrong
                  ? styles.tileWrong
                  : isCurrent
                    ? styles.tileCurrent
                    : styles.tileEmpty
            }`}
            aria-label={
              isWin ? 'Correct' : isWrong ? 'Wrong' : isCurrent ? 'Current' : 'Empty'
            }
          />
        )
      })}
      {showLabel && (
        <span className={styles.tilesLabel}>
          {playing
            ? `${max - guesses.length} left`
            : won
              ? 'Solved'
              : 'Done'}
        </span>
      )}
    </div>
  )
}
