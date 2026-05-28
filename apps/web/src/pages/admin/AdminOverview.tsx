import { useEffect, useState } from 'react'
import Dashboard13 from '@/components/blocks/dashboard13'
import { fetchAdminAnalytics, getStoredAdminCode } from '@/services/skzAdmin'
import { fetchPublicLeaderboard } from '@/services/skzLeaderboard'

export default function AdminOverview() {
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
    <div className="max-w-6xl">
      <header className="admin-page-header">
        <h1>Analytics</h1>
        <p>Traffic and game activity from site analytics.</p>
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
