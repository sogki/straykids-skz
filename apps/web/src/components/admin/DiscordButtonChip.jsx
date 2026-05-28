const STYLE_CLASS = {
  primary: 'bg-[#5865f2] text-white',
  success: 'bg-[#248046] text-white',
  danger: 'bg-[#da373c] text-white',
  secondary: 'bg-[#4e5058] text-white',
}

export default function DiscordButtonChip({
  label,
  emoji,
  style = 'primary',
  selected,
  expanded = false,
  showChevron = false,
  onClick,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 min-w-[7rem] max-w-full items-center justify-between gap-2 rounded px-4 text-sm font-medium transition-opacity ${STYLE_CLASS[style] || STYLE_CLASS.primary} ${selected ? 'ring-2 ring-white/30 ring-offset-2 ring-offset-[#18181b]' : ''} ${className}`}
    >
      <span className="inline-flex min-w-0 items-center gap-1.5">
        {emoji && <span className="text-base leading-none">{emoji}</span>}
        <span className="truncate">{label || 'Your button'}</span>
      </span>
      {showChevron && (
        <span
          className={`text-xs opacity-80 transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          ▾
        </span>
      )}
    </button>
  )
}

export { STYLE_CLASS }
