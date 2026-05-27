import { ChevronDown, ChevronUp, Flame, Sparkles } from 'lucide-react'
import HLCard from '@/components/higher-lower/HLCard'
import styles from '@/styles/HigherLower.module.css'

export default function HLBoard({
  category,
  left,
  right,
  score,
  bestStreak,
  status,
  lastPickCorrect,
  onPickHigher,
  onPickLower,
}) {
  const showAnswer = status !== 'playing'
  const buttonsDisabled = status !== 'playing'

  const flashRight =
    status === 'reveal'
      ? lastPickCorrect
        ? 'correct'
        : 'wrong'
      : null

  return (
    <div className={styles.boardWrap}>
      <header className={styles.boardHeader}>
        <p className={styles.boardKicker}>
          <Sparkles size={13} aria-hidden="true" />
          <span>{category?.label}</span>
        </p>
        <p className={styles.boardPrompt}>{category?.description}</p>
      </header>

      <div className={styles.scoreRow}>
        <div className={styles.scoreBlock}>
          <p className={styles.scoreLabel}>Streak</p>
          <p className={styles.scoreValue}>{score}</p>
        </div>
        <div className={styles.scoreBlock} data-align="end">
          <p className={styles.scoreLabel}>
            <Flame size={12} aria-hidden="true" />
            <span>Best</span>
          </p>
          <p className={styles.scoreValue}>{bestStreak}</p>
        </div>
      </div>

      <div className={styles.cardsRow}>
        <HLCard
          item={left}
          revealed
          unit={category?.unit}
          meta={left?.meta}
          side="left"
          formatValue={category?.formatValue}
        />

        <div className={styles.versus} aria-hidden="true">
          VS
        </div>

        <HLCard
          item={right}
          revealed={showAnswer}
          unit={category?.unit}
          meta={right?.meta}
          side="right"
          flashState={flashRight}
          formatValue={category?.formatValue}
        />
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.controlBtn} ${styles.controlHigher}`}
          onClick={onPickHigher}
          disabled={buttonsDisabled}
          aria-label={`Higher than ${left?.value ?? ''} ${category?.unit ?? ''}`}
        >
          <ChevronUp size={20} aria-hidden="true" />
          <span>Higher</span>
        </button>
        <button
          type="button"
          className={`${styles.controlBtn} ${styles.controlLower}`}
          onClick={onPickLower}
          disabled={buttonsDisabled}
          aria-label={`Lower than ${left?.value ?? ''} ${category?.unit ?? ''}`}
        >
          <ChevronDown size={20} aria-hidden="true" />
          <span>Lower</span>
        </button>
      </div>

      <p className={styles.tieHint}>Ties count as correct — either pick works.</p>
    </div>
  )
}
