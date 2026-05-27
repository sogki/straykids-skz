import { Flame, RotateCcw, Sparkles, Trophy, XCircle } from 'lucide-react'
import styles from '@/styles/HigherLower.module.css'

export default function HLComplete({
  category,
  left,
  right,
  score,
  bestStreak,
  onPlayAgain,
  onChangeCategory,
}) {
  const newBest = score === bestStreak && score > 0
  const fmt = category?.formatValue ?? ((v) => String(v ?? '—'))

  return (
    <section className={styles.completeWrap}>
      <div className={styles.completeIcon} aria-hidden="true">
        <XCircle size={32} strokeWidth={2.25} />
      </div>

      <p className={styles.completeKicker}>
        <Sparkles size={13} aria-hidden="true" />
        <span>{category?.label}</span>
      </p>
      <h2 className={styles.completeTitle}>Streak over</h2>
      <p className={styles.completeLead}>
        You picked {score === 0 ? 'on your first card' : 'wrong'} —{' '}
        <strong>{left?.label}</strong> ({fmt(left?.value)}
        {category?.unit ? ` ${category.unit}` : ''}) vs{' '}
        <strong>{right?.label}</strong> ({fmt(right?.value)}
        {category?.unit ? ` ${category.unit}` : ''}).
      </p>

      <div className={styles.completeStats}>
        <div className={styles.completeStat}>
          <Flame size={16} aria-hidden="true" />
          <div>
            <p className={styles.completeStatValue}>{score}</p>
            <p className={styles.completeStatLabel}>Final streak</p>
          </div>
        </div>
        <div className={styles.completeStat}>
          <Trophy size={16} aria-hidden="true" />
          <div>
            <p className={styles.completeStatValue}>{bestStreak}</p>
            <p className={styles.completeStatLabel}>
              {newBest ? 'New personal best!' : 'Personal best'}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.completeActions}>
        <button
          type="button"
          className={styles.completePrimary}
          onClick={onPlayAgain}
          autoFocus
        >
          <RotateCcw size={16} aria-hidden="true" />
          Play again
        </button>
        <button
          type="button"
          className={styles.completeSecondary}
          onClick={onChangeCategory}
        >
          Change category
        </button>
      </div>
    </section>
  )
}
