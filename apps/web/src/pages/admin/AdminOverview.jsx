import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  Bot,
  ChevronRight,
  Gamepad2,
  Inbox,
  Loader2,
  Megaphone,
  Trophy,
  Users,
  Eye,
  Zap,
} from 'lucide-react'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { fetchAdminAnalytics, getStoredAdminCode } from '@/services/skzAdmin'
import { adminCalloutError, adminPanel } from '@/components/admin/adminUi'

function StatTile({ label, value, hint, icon: Icon }) {
  return (
    <div className="admin-dashboard-stat">
      <div className="admin-dashboard-stat__head">
        <span className="admin-dashboard-stat__label">{label}</span>
        <Icon className="admin-dashboard-stat__icon" aria-hidden />
      </div>
      <p className="admin-dashboard-stat__value">{value}</p>
      {hint ? <p className="admin-dashboard-stat__hint">{hint}</p> : null}
    </div>
  )
}

function QuickLinkCard({ to, title, description, icon: Icon, iconClass }) {
  return (
    <Link to={to} className="admin-dashboard-link">
      <span className={`admin-dashboard-link__icon ${iconClass}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="admin-dashboard-link__body">
        <span className="admin-dashboard-link__title">{title}</span>
        <span className="admin-dashboard-link__desc">{description}</span>
      </span>
      <ChevronRight className="admin-dashboard-link__chevron" aria-hidden />
    </Link>
  )
}

export default function AdminOverview() {
  const { isFullAdmin, isModerator, access, featureAccess } = useAdminAccess()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(isFullAdmin)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFullAdmin) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const code = getStoredAdminCode()
        const data = await fetchAdminAnalytics(code, 7)
        if (!cancelled) setAnalytics(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isFullAdmin])

  const totals = (analytics?.totals ?? {})
  const uniqueSessions = Number(analytics?.unique_sessions ?? 0)
  const pageViews = Number(totals.page_views ?? 0)
  const gameStarts = Number(totals.game_starts ?? 0)

  const displayName = access?.discord_display_name || 'Staff'
  const canBotHealth = isFullAdmin
    ? featureAccess.bot_health !== false
    : Boolean(featureAccess.bot_health)

  const websiteLinks = useMemo(
    () => [
      {
        to: '/admin/analytics',
        title: 'Analytics',
        description: 'Traffic charts, activity stream, and game retention.',
        icon: BarChart3,
        iconClass: 'admin-dashboard-link__icon--violet',
      },
      {
        to: '/admin/games',
        title: 'Games',
        description: 'Enable or disable arcade games on the site.',
        icon: Gamepad2,
        iconClass: 'admin-dashboard-link__icon--pink',
      },
      {
        to: '/admin/leaderboard',
        title: 'Leaderboard',
        description: 'Country exclusions, resets, and preview.',
        icon: Trophy,
        iconClass: 'admin-dashboard-link__icon--amber',
      },
      {
        to: '/admin/banner',
        title: 'Site banner',
        description: 'Site-wide announcement bar and link.',
        icon: Megaphone,
        iconClass: 'admin-dashboard-link__icon--sky',
      },
      {
        to: '/admin/requests',
        title: 'Requests',
        description: 'Contact and legal request inbox.',
        icon: Inbox,
        iconClass: 'admin-dashboard-link__icon--emerald',
      },
    ],
    [],
  )

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-hero">
        <div>
          <p className="admin-dashboard-hero__eyebrow">SKZ Admin</p>
          <h1 className="admin-dashboard-hero__title">Welcome back, {displayName}</h1>
          <p className="admin-dashboard-hero__desc">
            {isFullAdmin
              ? 'Site overview and quick links to website and Discord bot tools.'
              : isModerator
                ? 'Moderator access — open Discord bot features from the sidebar.'
                : 'Staff panel overview.'}
          </p>
        </div>
        <Link to="/admin/bot/features" className="admin-dashboard-hero__cta">
          <Bot className="size-4" />
          Discord bot features
        </Link>
      </header>

      {isFullAdmin && (
        <section className="admin-dashboard-section">
          <div className="admin-dashboard-section__head">
            <h2>Last 7 days</h2>
            <Link to="/admin/analytics" className="admin-dashboard-section__more">
              Full analytics
              <ChevronRight className="size-4" />
            </Link>
          </div>
          {loading ? (
            <div className="admin-dashboard-loading">
              <Loader2 className="size-5 animate-spin" />
              Loading summary…
            </div>
          ) : error ? (
            <p className={adminCalloutError}>{error}</p>
          ) : (
            <div className="admin-dashboard-stats">
              <StatTile
                label="Unique sessions"
                value={uniqueSessions.toLocaleString()}
                hint="Distinct visitors"
                icon={Users}
              />
              <StatTile
                label="Page views"
                value={pageViews.toLocaleString()}
                hint="All routes"
                icon={Eye}
              />
              <StatTile
                label="Game starts"
                value={gameStarts.toLocaleString()}
                hint="Open Analytics for per-game retention"
                icon={Zap}
              />
            </div>
          )}
        </section>
      )}

      {isFullAdmin && (
        <section className="admin-dashboard-section">
          <div className="admin-dashboard-section__head">
            <h2>Website</h2>
          </div>
          <div className={`${adminPanel} admin-dashboard-links-panel`}>
            <div className="admin-dashboard-links">
              {websiteLinks.map((item) => (
                <QuickLinkCard key={item.to} {...item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {(isFullAdmin || isModerator) && (
        <section className="admin-dashboard-section">
          <div className="admin-dashboard-section__head">
            <h2>Discord bot</h2>
            <Link to="/admin/bot/features" className="admin-dashboard-section__more">
              All features
              <ChevronRight className="size-4" />
            </Link>
          </div>
          <div className={`${adminPanel} admin-dashboard-links-panel`}>
            <p className="admin-dashboard-bot-hint">
              Bot configuration lives under <strong>Discord bot</strong> in the sidebar — each
              feature has its own entry. Start from Features for the full hub.
            </p>
            <div className="admin-dashboard-links admin-dashboard-links--compact">
              <QuickLinkCard
                to="/admin/bot/features"
                title="Features"
                description="Hub for panels, QOTD, moderation, health, and more."
                icon={Bot}
                iconClass="admin-dashboard-link__icon--violet"
              />
              {canBotHealth ? (
                <QuickLinkCard
                  to="/admin/bot/health"
                  title="Bot health"
                  description="Connection status, outbox queue, and scheduler metrics."
                  icon={Bot}
                  iconClass="admin-dashboard-link__icon--rose"
                />
              ) : null}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
