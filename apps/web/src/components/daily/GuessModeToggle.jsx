import { NavLink } from 'react-router-dom'
import { CalendarDays, Infinity as InfinityIcon } from 'lucide-react'
import styles from '@/styles/DailyGuess.module.css'

/**
 * Daily | Unlimited switcher, rendered as a single pill with two routes.
 * Used in the `headerActions` slot of each guess game's GameShell.
 */
export default function GuessModeToggle({ dailyHref, unlimitedHref, mode }) {
  return (
    <div className={styles.modeToggle} role="tablist" aria-label="Game mode">
      <NavLink
        to={dailyHref}
        end
        className={({ isActive }) =>
          `${styles.modeOption} ${
            (isActive || mode === 'daily') ? styles.modeOptionActive : ''
          }`
        }
        role="tab"
        aria-selected={mode === 'daily'}
      >
        <CalendarDays size={14} aria-hidden="true" />
        <span>Daily</span>
      </NavLink>
      <NavLink
        to={unlimitedHref}
        className={({ isActive }) =>
          `${styles.modeOption} ${
            (isActive || mode === 'unlimited') ? styles.modeOptionActive : ''
          }`
        }
        role="tab"
        aria-selected={mode === 'unlimited'}
      >
        <InfinityIcon size={14} aria-hidden="true" />
        <span>Unlimited</span>
      </NavLink>
    </div>
  )
}
