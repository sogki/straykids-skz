import { Play, Sparkles } from 'lucide-react'
import { HIGHER_LOWER_CATEGORY_LIST } from '@/data/higherLowerData'
import styles from '@/styles/HigherLower.module.css'

const STEPS = [
  'Compare two SKZ items. The left value is shown; the right is hidden.',
  'Tap Higher or Lower for the right card.',
  'Get it right → keep stacking. One miss ends the run.',
]

export default function HLIntro({ selectedCategoryId, onSelect, onStart }) {
  return (
    <section className={styles.introWrap}>
      <div className={styles.introHeader}>
        <p className={styles.introKicker}>
          <Sparkles size={13} aria-hidden="true" />
          <span>Pick a category</span>
        </p>
        <h2 className={styles.introTitle}>How long can you keep the streak?</h2>
      </div>

      <ol className={styles.howSteps}>
        {STEPS.map((step, i) => (
          <li key={i}>
            <span className={styles.howStepIndex}>{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className={styles.categoryGrid}>
        {HIGHER_LOWER_CATEGORY_LIST.map((cat) => {
          const active = cat.id === selectedCategoryId
          return (
            <button
              key={cat.id}
              type="button"
              className={`${styles.categoryCard} ${
                active ? styles.categoryCardActive : ''
              }`}
              onClick={() => onSelect(cat.id)}
              style={{ '--game-accent': cat.accent }}
            >
              <p className={styles.categoryLabel}>{cat.label}</p>
              <p className={styles.categoryDesc}>{cat.description}</p>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className={styles.startBtn}
        onClick={onStart}
        disabled={!selectedCategoryId}
      >
        <Play size={16} strokeWidth={2.4} aria-hidden="true" />
        Start round
      </button>
    </section>
  )
}
