import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function leaderboardTotalPages(totalCount, pageSize) {
  const total = Number(totalCount) || 0
  if (total <= 0) return 1
  return Math.max(1, Math.ceil(total / pageSize))
}

export default function LeaderboardPagination({
  page,
  totalPages,
  onPageChange,
  className,
  compact = false,
}) {
  if (totalPages <= 1) return null

  const safePage = Math.min(Math.max(1, page), totalPages)

  return (
    <nav
      className={cn('leaderboard-pagination', compact && 'leaderboard-pagination--compact', className)}
      aria-label="Leaderboard pagination"
    >
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon-sm' : 'sm'}
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        {!compact && <span>Previous</span>}
      </Button>
      <span className="leaderboard-pagination__status">
        Page {safePage} of {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon-sm' : 'sm'}
        disabled={safePage >= totalPages}
        onClick={() => onPageChange(safePage + 1)}
        aria-label="Next page"
      >
        {!compact && <span>Next</span>}
        <ChevronRight size={16} aria-hidden="true" />
      </Button>
    </nav>
  )
}
