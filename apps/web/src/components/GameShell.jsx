import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import styles from '../styles/GameShell.module.css'

export default function GameShell({
  title,
  subtitle,
  meta,
  emoji,
  accent = '#ffffff',
  wide = false,
  extraWide = false,
  fullWidth = false,
  fanProfileStudio = false,
  headerActions,
  aside,
  children,
}) {
  return (
    <div
      className={`${styles.shell} ${wide ? styles.shellWide : ''} ${
        extraWide ? styles.shellExtraWide : ''
      } ${fullWidth ? styles.shellFullWidth : ''} ${
        fanProfileStudio ? styles.shellFanProfile : ''
      } ${aside ? styles.shellWithAside : ''}`}
      style={{ '--game-accent': accent }}
    >
      <Link to="/arcade" className={styles.back}>
        <ArrowLeft size={18} strokeWidth={2.25} aria-hidden="true" />
        Back to Arcade
      </Link>

      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.headerTop}>
            {emoji && (
              <span className={styles.emoji} aria-hidden="true">
                {emoji}
              </span>
            )}
            <div className={styles.headerText}>
              <p className={styles.kicker}>Now playing</p>
              <h1 className={styles.title}>{title}</h1>
            </div>
          </div>
          {headerActions && (
            <div className={styles.headerActions}>{headerActions}</div>
          )}
        </div>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {meta && <div className={styles.meta}>{meta}</div>}
      </header>

      <div className={aside ? styles.bodyLayout : styles.body}>
        <div className={styles.main}>{children}</div>
        {aside && <aside className={styles.aside}>{aside}</aside>}
      </div>
    </div>
  )
}
