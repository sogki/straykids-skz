import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import AdminKpiCards from '@/components/admin/AdminKpiCards'
import AnalyticsCharts from '@/components/admin/AnalyticsCharts'
import { fetchAdminAnalytics, getStoredAdminCode } from '@/services/skzAdmin'

export default function AdminOverview({ title = 'Overview', showRange = true }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(7)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAdminAnalytics(getStoredAdminCode(), days)
        if (!cancelled) setAnalytics(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [days])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Counts from <code className="text-zinc-400">skz_analytics_events</code>
            {' '}(excluded countries omitted from KPIs — see Leaderboard).
          </p>
        </div>
        {showRange && (
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 rounded-md border border-white/10 bg-[#111113] px-3 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 size={20} className="animate-spin" />
          Loading analytics…
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loading && !error && analytics && (
        <>
          <AdminKpiCards analytics={analytics} />
          <AnalyticsCharts analytics={analytics} />
        </>
      )}
    </div>
  )
}
