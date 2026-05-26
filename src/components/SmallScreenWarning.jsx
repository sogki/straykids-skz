import { useEffect, useState } from 'react'
import { Monitor, X } from 'lucide-react'
import '@/styles/SmallScreenWarning.css'

const STORAGE_KEY = 'skz_small_screen_warning_dismissed_v1'
const BREAKPOINT_PX = 900

function isSmallViewport() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < BREAKPOINT_PX
}

function readDismissed() {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* storage may be blocked – fail silently */
  }
}

export default function SmallScreenWarning() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const evaluate = () => {
      if (readDismissed()) {
        setOpen(false)
        return
      }
      setOpen(isSmallViewport())
    }

    evaluate()

    let frame = 0
    const handler = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(evaluate)
    }

    window.addEventListener('resize', handler)
    window.addEventListener('orientationchange', handler)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', handler)
      window.removeEventListener('orientationchange', handler)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const dismiss = () => {
    writeDismissed()
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="skz-screen-warning"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skz-screen-warning-title"
      aria-describedby="skz-screen-warning-desc"
    >
      <div className="skz-screen-warning__backdrop" aria-hidden="true" />
      <div className="skz-screen-warning__card" role="document">
        <button
          type="button"
          className="skz-screen-warning__close"
          onClick={dismiss}
          aria-label="Close warning"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="skz-screen-warning__icon" aria-hidden="true">
          <Monitor size={28} />
        </div>

        <p className="skz-screen-warning__kicker">Heads up</p>
        <h2 id="skz-screen-warning-title" className="skz-screen-warning__title">
          This site is best on a larger screen
        </h2>
        <p id="skz-screen-warning-desc" className="skz-screen-warning__text">
          Our games and tools are designed for desktop. On smaller screens, some
          layouts may overflow, overlap, or feel cramped. For the best experience,
          open the site on a laptop or desktop.
        </p>

        <ul className="skz-screen-warning__list">
          <li>Multi-column game boards (Tier List, Profile Builder)</li>
          <li>Drag &amp; drop interactions</li>
          <li>Wide image galleries &amp; previews</li>
        </ul>

        <div className="skz-screen-warning__actions">
          <button
            type="button"
            className="skz-screen-warning__primary"
            onClick={dismiss}
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  )
}
