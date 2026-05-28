import { cn } from '@/lib/utils'

/**
 * Segmented toggle (Players / Countries, All time / 30 days).
 */
export function LeaderboardSegments({
  options,
  value,
  onChange,
  size = 'md',
  ariaLabel,
}) {
  return (
    <div
      className={cn(
        'stay-board__segments',
        size === 'sm' && 'stay-board__segments--sm',
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              'stay-board__segment',
              active && 'stay-board__segment--active',
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
