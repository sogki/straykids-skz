import Dashboard13 from '@/components/blocks/dashboard13'
import { ANALYTICS_PAGE_INTRO } from '@/components/admin/adminCopy'
import { fetchAdminAnalytics, getStoredAdminCode } from '@/services/skzAdmin'
import { fetchPublicLeaderboard } from '@/services/skzLeaderboard'
import { useEffect, useState } from 'react'

/** Full analytics dashboard — traffic, games retention, activity stream. */
export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(7)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const code = getStoredAdminCode()
        const [analyticsData, leaderboardData] = await Promise.all([
          fetchAdminAnalytics(code, days),
          fetchPublicLeaderboard(days),
        ])
        if (!cancelled) {
          setAnalytics(analyticsData)
          setLeaderboard(leaderboardData)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [days])

  return (
    <div className="admin-dashboard admin-dashboard--analytics">
      <header className="admin-dashboard-section__head admin-dashboard-section__head--page">
        <div>
          <h1 className="admin-dashboard-page-title">Analytics</h1>
          <p className="admin-dashboard-page-desc">{ANALYTICS_PAGE_INTRO}</p>
        </div>
      </header>
      <Dashboard13
        analytics={analytics}
        leaderboard={leaderboard}
        loading={loading}
        error={error}
        days={days}
        onDaysChange={setDays}
      />
    </div>
  )
}
