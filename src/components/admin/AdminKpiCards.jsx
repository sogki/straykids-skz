import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Eye, Gamepad2, Users } from 'lucide-react'

export default function AdminKpiCards({ analytics }) {
  const totals = analytics?.totals ?? {}
  const raw = analytics?.totals_raw ?? totals
  const unique = analytics?.unique_sessions ?? 0
  const excluded = analytics?.excluded_countries ?? []
  const hasFilter = excluded.length > 0

  const items = [
    {
      label: 'Page views',
      value: totals.page_views ?? 0,
      icon: Eye,
      sub: `${analytics?.days ?? 7}d window`,
    },
    {
      label: 'Game starts',
      value: totals.game_starts ?? 0,
      icon: Gamepad2,
      sub: 'Cabinet opens',
    },
    {
      label: 'Unique sessions',
      value: unique,
      icon: Users,
      sub: 'Distinct visitors',
    },
    {
      label: 'All events',
      value: totals.all_events ?? 0,
      icon: Activity,
      sub: hasFilter
        ? `Raw: ${(raw.all_events ?? 0).toLocaleString()}`
        : 'Total tracked',
    },
  ]

  return (
    <div className="space-y-3">
      {hasFilter && (
        <p className="text-sm text-amber-200/90">
          KPIs exclude leaderboard-blocked countries:{' '}
          <span className="font-mono">{excluded.join(', ')}</span>
        </p>
      )}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, icon: Icon, sub }) => (
        <Card key={label} className="border-white/10 bg-[#111113]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              {label}
            </CardTitle>
            <Icon size={16} className="text-zinc-500" />
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {value.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
    </div>
  )
}
