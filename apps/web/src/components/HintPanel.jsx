import styles from '../styles/DailyGuess.module.css'

/**
 * Clue progress + current clue (centered stage layout).
 */
export default function HintPanel({ ladder, variant = 'stage' }) {
  const unlocked = ladder.filter((h) => h.unlocked)
  const active =
    [...unlocked].reverse().find((h) => h.type !== 'prompt') ??
    unlocked[unlocked.length - 1]
  const lockedCount = ladder.length - unlocked.length

  return (
    <section
      className={
        variant === 'stage' ? styles.clueStage : styles.clues
      }
      aria-label="Clues"
    >
      <div className={styles.clueDots} aria-hidden="true">
        {ladder.map((hint) => (
          <span
            key={hint.index}
            className={`${styles.clueDot} ${
              hint.unlocked ? styles.clueDotOn : ''
            }`}
            title={hint.label}
          />
        ))}
      </div>

      {active ? (
        <div className={styles.clueActive}>
          <span className={styles.clueActiveLabel}>{active.label}</span>
          {active.type === 'prompt' ? (
            <p className={styles.cluePrompt}>{active.content}</p>
          ) : active.type === 'emoji' ? (
            <p className={styles.clueEmoji}>{active.content}</p>
          ) : active.type === 'skzoo' && active.image ? (
            <div className={styles.clueSkzoo}>
              <img src={active.image} alt="" width={72} height={72} />
              <p className={styles.clueText}>{active.content}</p>
            </div>
          ) : active.type === 'lyric' ? (
            <p className={styles.clueLyric}>{active.content}</p>
          ) : (
            <p className={styles.clueText}>{active.content}</p>
          )}
        </div>
      ) : (
        <p className={styles.clueEmpty}>Make a guess to reveal the first clue.</p>
      )}

      {lockedCount > 0 && (
        <p className={styles.clueLockedNote}>
          {lockedCount} more clue{lockedCount === 1 ? '' : 's'} unlock after a
          wrong guess
        </p>
      )}
    </section>
  )
}
