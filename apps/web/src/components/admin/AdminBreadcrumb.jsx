import { ChevronRight } from 'lucide-react'

/**
 * @param {{ items: Array<{ key: string, label: string, onClick?: () => void }> }} props
 */
export default function AdminBreadcrumb({ items }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap items-center gap-1 text-sm"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={item.key} className="inline-flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="size-3.5 shrink-0 text-zinc-600" aria-hidden />
            )}
            {isLast || !item.onClick ? (
              <span
                className={isLast ? 'font-medium text-zinc-200' : 'text-zinc-500'}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="rounded px-0.5 text-zinc-400 transition-colors hover:text-zinc-100"
              >
                {item.label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
