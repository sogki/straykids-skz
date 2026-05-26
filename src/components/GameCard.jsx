import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import styles from '../styles/GameCard.module.css'

export default function GameCard({ game, className = '', variant = 'row' }) {
  const isTile = variant === 'tile'
  const accent = game.color || 'var(--correct)'

  return (
    <Link
      to={game.path}
      className={`${styles.card} ${isTile ? styles.tile : ''} ${className}`.trim()}
      style={{ '--card-accent': accent }}
    >
      {game.image && (
        <div className={styles.thumb}>
          <img src={game.image} alt="" loading="lazy" />
        </div>
      )}
      <div className={styles.body}>
        <div className={styles.top}>
          <span className={styles.emoji}>{game.emoji}</span>
          {game.tag && <span className={styles.tag}>{game.tag}</span>}
        </div>
        <h3 className={styles.title}>{game.title}</h3>
        <p className={styles.description}>{game.description}</p>
        {isTile && (
          <span className={styles.playLink}>
            Play
            <ArrowRight size={14} aria-hidden="true" />
          </span>
        )}
      </div>
    </Link>
  )
}
