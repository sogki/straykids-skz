import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import AdminSwitch from '@/components/admin/AdminSwitch'
import {
  adminCollapsible,
  adminCollapsibleActions,
  adminCollapsibleBody,
  adminCollapsibleHead,
  adminCollapsibleTrigger,
} from '@/components/admin/adminUi'

export default function CollapsibleSection({
  title,
  subtitle,
  badge,
  defaultOpen = true,
  open,
  onOpenChange,
  actions = null,
  switch: headerSwitch = null,
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
    <div className={adminCollapsible}>
      <div className={adminCollapsibleHead}>
        <button type="button" onClick={toggle} className={adminCollapsibleTrigger}>
          <ChevronDown
            className={`size-5 shrink-0 text-zinc-500 transition-transform ${isOpen ? '' : '-rotate-90'}`}
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-zinc-100">{title}</span>
              {badge != null && (
                <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-xs font-medium text-zinc-400">
                  {badge}
                </span>
              )}
            </span>
            {subtitle && (
              <span className="mt-0.5 block text-sm text-zinc-500">{subtitle}</span>
            )}
          </span>
        </button>
        {headerSwitch ? (
          <div
            className="admin-collapsible__switch"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <AdminSwitch
              checked={headerSwitch.checked}
              onChange={headerSwitch.onChange}
              disabled={headerSwitch.disabled}
              aria-label={headerSwitch.ariaLabel || title}
            />
          </div>
        ) : null}
        {actions ? (
          <div
            className={adminCollapsibleActions}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        ) : null}
      </div>
      {isOpen && <div className={adminCollapsibleBody}>{children}</div>}
    </div>
  )
}
