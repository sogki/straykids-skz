/**
 * Pill toggle matching BotAdmin ToggleField / panel admin UI (violet on).
 */
export default function AdminSwitch({
  checked,
  onChange,
  'aria-label': ariaLabel,
  title,
  size = 'default',
  className = '',
}) {
  const compact = size === 'sm'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={title}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors ${
        compact ? 'h-5 w-9' : 'h-6 w-11'
      } ${checked ? 'bg-violet-500' : 'bg-zinc-700'} ${className}`}
    >
      <span
        className={`absolute top-0.5 rounded-full bg-white shadow transition-transform ${
          compact ? 'size-4' : 'size-5'
        } ${checked ? (compact ? 'left-[18px]' : 'left-[22px]') : 'left-0.5'}`}
      />
    </button>
  )
}
