import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Compact game picker for the STAY board — matches arcade hub pill styling.
 */
export default function LeaderboardGameSelect({
  value,
  onChange,
  options,
  className,
}) {
  const listId = useId()
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)

  const selected = options.find((o) => o.slug === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function pick(slug) {
    onChange(slug)
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={cn('stay-board__picker', className)}
      data-open={open || undefined}
    >
      <button
        type="button"
        className="stay-board__picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="stay-board__picker-label">{selected?.label}</span>
        <ChevronDown
          size={16}
          className="stay-board__picker-chevron"
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="stay-board__picker-menu"
          aria-label="Leaderboard game"
        >
          {options.map((opt) => {
            const active = opt.slug === value
            return (
              <li key={opt.slug} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    'stay-board__picker-option',
                    active && 'stay-board__picker-option--active'
                  )}
                  onClick={() => pick(opt.slug)}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
