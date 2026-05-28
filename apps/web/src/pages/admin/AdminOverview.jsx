import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import AdminSelect from '@/components/admin/AdminSelect'
import { ANALYTICS_INTRO } from '@/components/admin/adminCopy'
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
            {ANALYTICS_INTRO}
          </p>
        </div>
        {showRange && (
          <AdminSelect
            wrapperClassName="admin-select-wrap--inline w-auto min-w-[10rem]"
            size="sm"
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </AdminSelect>
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
