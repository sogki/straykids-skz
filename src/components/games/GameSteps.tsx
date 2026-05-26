import styles from '@/styles/GameSteps.module.css'

interface GameStepsProps {
  steps: string[]
  /** sidebar: aside column · header: next to game title · compact: collapsible block */
  variant?: 'sidebar' | 'compact' | 'header'
}

export default function GameSteps({
  steps,
  variant = 'sidebar',
}: GameStepsProps) {
  if (variant === 'header') {
    return (
      <details className={styles.headerHowTo}>
        <summary>How to play</summary>
        <ol className={styles.headerHowToList}>
          {steps.map((step, i) => (
            <li key={step}>
              <span className={styles.num}>{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </details>
    )
  }

  if (variant === 'compact') {
    return (
      <details className={styles.stepsWrap}>
        <summary>How to play</summary>
        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li key={step}>
              <span className={styles.num}>{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </details>
    )
  }

  return (
    <>
      <div className={styles.sidebarPanel}>
        <h2 className={styles.sidebarTitle}>How to play</h2>
        <ol className={styles.sidebarSteps}>
          {steps.map((step, i) => (
            <li key={step}>
              <span className={styles.sidebarNum}>{i + 1}</span>
              <span className={styles.sidebarText}>{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <details className={`${styles.stepsWrap} ${styles.stepsWrapMobile}`}>
        <summary>How to play</summary>
        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li key={step}>
              <span className={styles.num}>{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </details>
    </>
  )
}
