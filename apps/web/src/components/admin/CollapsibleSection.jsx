import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function CollapsibleSection({
  title,
  subtitle,
  badge,
  defaultOpen = true,
  open,
  onOpenChange,
  children,
}) {
  const isControlled = open !== undefined
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = isControlled ? open : internalOpen

  function toggle() {
    if (isControlled) onOpenChange?.(!isOpen)
    else setInternalOpen((v) => !v)
  }

  return (
    <div className="overflow-visible rounded-xl border border-zinc-800/90 bg-[#18181b]">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[#1c1c20]"
      >
        <ChevronDown
          className={`size-5 shrink-0 text-zinc-500 transition-transform ${isOpen ? '' : '-rotate-90'}`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-zinc-100">{title}</span>
            {badge != null && (
              <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                {badge}
              </span>
            )}
          </span>
          {subtitle && (
            <span className="mt-0.5 block text-sm text-zinc-500">{subtitle}</span>
          )}
        </span>
      </button>
      {isOpen && <div className="border-t border-zinc-800/80 px-5 pb-5 pt-4">{children}</div>}
    </div>
  )
}
