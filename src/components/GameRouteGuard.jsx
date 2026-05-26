import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useSkzData } from '@/context/SkzDataContext'

/**
 * Blocks rendering of a game page when its slug isn't in the active games list.
 * Public game queries already filter by is_active=true, so disabling a game
 * in the admin panel also blocks anyone navigating to its URL directly.
 */
export default function GameRouteGuard({ slug, children }) {
  const { games, loading } = useSkzData()

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          minHeight: '40vh',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
        }}
      >
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        <span>Loading…</span>
      </div>
    )
  }

  const isActive = games.some((g) => (g.slug ?? g.id) === slug)
  if (isActive) return children

  return <Navigate to="/arcade" replace state={{ disabledGame: slug }} />
}
