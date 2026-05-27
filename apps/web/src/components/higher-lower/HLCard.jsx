import { motion } from 'framer-motion'
import styles from '@/styles/HigherLower.module.css'

function defaultFormat(value) {
  if (value === null || value === undefined) return '—'
  return String(value)
}

export default function HLCard({
  item,
  revealed,
  unit,
  meta,
  highlight,
  side,
  flashState, // 'correct' | 'wrong' | null
  formatValue = defaultFormat,
}) {
  if (!item) {
    return <div className={styles.cardPlaceholder} aria-hidden="true" />
  }

  return (
    <motion.article
      className={`${styles.card} ${
        flashState === 'correct'
          ? styles.cardCorrect
          : flashState === 'wrong'
            ? styles.cardWrong
            : ''
      }`}
      data-side={side}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className={styles.cardImageWrap} aria-hidden="true">
        {item.image ? (
          <img
            className={styles.cardImage}
            src={item.image}
            alt=""
            draggable={false}
          />
        ) : (
          <div className={styles.cardImageFallback}>{item.label?.charAt(0)}</div>
        )}
        <div className={styles.cardImageVeil} />
      </div>

      <div className={styles.cardBody}>
        <p className={styles.cardLabel}>{item.label}</p>
        {revealed ? (
          <motion.p
            key={`${item.id}-value`}
            className={styles.cardValue}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {formatValue(item.value)}
            {unit && <span className={styles.cardValueUnit}>{unit}</span>}
          </motion.p>
        ) : (
          <p className={styles.cardValueHidden} aria-hidden="true">
            ?
          </p>
        )}
        {meta && revealed && <p className={styles.cardMeta}>{meta}</p>}
      </div>

      {highlight && <div className={styles.cardHighlight} aria-hidden="true" />}
    </motion.article>
  )
}
