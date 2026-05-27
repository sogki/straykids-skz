/**
 * Dashboard 13 — Real-Time Sessions & Latency Analytics layout
 * @see https://www.shadcnblocks.com/block/dashboard13
 *
 * Install official block (requires Pro API key):
 *   npx shadcn add @shadcnblocks/dashboard13
 * Then replace this file's default export with the generated component.
 */
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  AlertCircle,
  BarChart3,
  Loader2,
  Radio,
  Search,
  Timer,
  Users,
  Zap,
} from 'lucide-react'
import { useMotionValueEvent, useSpring } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { countryCodeToFlag, getCountryName } from '@/utils/country'

const GAME_LABELS: Record<string, string> = {
  'guess-song': 'Daily Song Guess',
  'fan-profile': 'Fan Profile Maker',
  'bias-quiz': 'Bias Quiz',
}

function friendlyGameName(slug: string) {
  return GAME_LABELS[slug] ?? slug.replace(/-/g, ' ')
}

function AnimatedMetric({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 90, damping: 22 })
  const [display, setDisplay] = useState('0')

  useMotionValueEvent(spring, 'change', (v) => {
    setDisplay(Math.round(v).toLocaleString())
  })

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  return (
    <span className="font-mono text-2xl font-semibold tabular-nums">{display}</span>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  animate = false,
}: {
  label: string
  value: number | string
  sub: string
  icon: ComponentType<{ className?: string }>
  animate?: boolean
}) {
  return (
    <Card size="sm" className="bg-card/80">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {animate && typeof value === 'number' ? (
          <AnimatedMetric value={value} />
        ) : (
          <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

function TrafficChart({ byDay = [] }: { byDay: Array<Record<string, unknown>> }) {
  const max = Math.max(1, ...byDay.map((d) => Number(d.page_views ?? 0)))

  if (byDay.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Traffic data will appear as visitors use the site.
      </div>
    )
  }

  return (
    <div className="flex h-[280px] items-end gap-2 px-1 pt-6">
      {byDay.map((d) => {
        const views = Number(d.page_views ?? 0)
        const h = (views / max) * 100
        return (
          <div key={String(d.day)} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">{views}</span>
            <div className="relative flex w-full max-w-12 flex-1 items-end justify-center">
              <div
                className="w-full rounded-t-sm bg-primary/80 transition-all"
                style={{ height: `${Math.max(h, 6)}%` }}
              />
            </div>
            <span className="truncate text-[10px] text-muted-foreground">
              {String(d.day).slice(5)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function EventStream({
  events,
  query,
}: {
  events: Array<Record<string, unknown>>
  query: string
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return events
    return events.filter((ev) => {
      const type = String(ev.event_type ?? '').toLowerCase()
      const path = String(ev.path ?? ev.game_slug ?? '').toLowerCase()
      return type.includes(q) || path.includes(q)
    })
  }, [events, query])

  return (
    <ScrollArea className="h-[280px] pr-3">
      <ul className="space-y-2">
        {filtered.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted-foreground">
            No matching events.
          </li>
        ) : (
          filtered.map((ev, i) => {
            const type = String(ev.event_type ?? '')
            const tone =
              type === 'page_view'
                ? 'bg-sky-500/15 text-sky-400'
                : type === 'game_start'
                  ? 'bg-violet-500/15 text-violet-400'
                  : 'bg-emerald-500/15 text-emerald-400'
            return (
              <li
                key={`${ev.created_at}-${i}`}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
              >
                <Badge variant="outline" className={cn('shrink-0 border-0', tone)}>
                  {type}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-foreground">
                    {String(ev.path || ev.game_slug || '—')}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {new Date(String(ev.created_at)).toLocaleString()}
                  </p>
                </div>
              </li>
            )
          })
        )}
      </ul>
    </ScrollArea>
  )
}

function MetricListCard({
  title,
  description,
  rows,
  valueKey,
  subKey,
  maxRef,
}: {
  title: string
  description: string
  rows: Array<Record<string, unknown>>
  valueKey: string
  subKey: string
  maxRef?: number
}) {
  const max = maxRef ?? Math.max(1, ...rows.map((r) => Number(r[valueKey] ?? 0)))

  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
        ) : (
          rows.map((row, i) => {
            const val = Number(row[valueKey] ?? 0)
            const sub = row[subKey]
            const pct = Math.round((val / max) * 100)
            const code = row.country_code as string | undefined
            const slug = row.game_slug as string | undefined
            const label = code
              ? getCountryName(code)
              : slug
                ? friendlyGameName(slug)
                : String(row.label ?? '—')

            return (
              <div
                key={String(row.country_code ?? row.game_slug ?? i)}
                className="group space-y-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  {code && (
                    <span className="text-base" aria-hidden="true">
                      {countryCodeToFlag(code)}
                    </span>
                  )}
                  <span className="flex-1 truncate text-sm font-medium">{label}</span>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {val.toLocaleString()}
                  </span>
                  <span className="w-12 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {typeof sub === 'number' ? `${sub}%` : sub}
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/70 transition-all"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-px bg-foreground/25"
                    style={{ left: '50%' }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

export interface Dashboard13Props {
  analytics: Record<string, unknown> | null
  leaderboard?: { entries?: Array<Record<string, unknown>> } | null
  loading?: boolean
  error?: string | null
  days?: number
  onDaysChange?: (days: number) => void
  searchPlaceholder?: string
}

export default function Dashboard13({
  analytics,
  leaderboard,
  loading,
  error,
  days = 7,
  onDaysChange,
  searchPlaceholder = 'Filter activity…',
}: Dashboard13Props) {
  const [search, setSearch] = useState('')

  const totals = (analytics?.totals as Record<string, number>) ?? {}
  const uniqueSessions = Number(analytics?.unique_sessions ?? 0)
  const pageViews = totals.page_views ?? 0
  const gameStarts = totals.game_starts ?? 0
  const gameCompletes = totals.game_completes ?? 0
  const allEvents = totals.all_events ?? 0

  const eventsPerMin = useMemo(() => {
    const minutes = days * 24 * 60
    return minutes > 0 ? (allEvents / minutes).toFixed(1) : '0'
  }, [allEvents, days])

  const finishRate = useMemo(() => {
    if (!gameStarts) return 0
    return Math.round((gameCompletes / gameStarts) * 1000) / 10
  }, [gameStarts, gameCompletes])

  const dropOff = useMemo(() => {
    if (!gameStarts) return 0
    return Math.round(((gameStarts - gameCompletes) / gameStarts) * 1000) / 10
  }, [gameStarts, gameCompletes])

  const countryRows = useMemo(() => {
    return (leaderboard?.entries ?? []).map((e) => ({
      country_code: e.country_code,
      correct_wins: e.correct_wins,
      retention_pct: e.retention_pct,
    }))
  }, [leaderboard])

  const gameRows = useMemo(() => {
    return ((analytics?.by_game as Array<Record<string, unknown>>) ?? []).map((g) => {
      const starts = Number(g.starts ?? 0)
      const completes = Number(g.completes ?? 0)
      const rate = starts ? Math.round((completes / starts) * 100) : 0
      return { ...g, finish_rate: rate }
    })
  }, [analytics])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading dashboard…
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          {onDaysChange && (
            <select
              value={days}
              onChange={(e) => onDaysChange(Number(e.target.value))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          )}
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Live
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active sessions"
          value={uniqueSessions}
          sub={`Unique visitors · ${days}d`}
          icon={Users}
          animate
        />
        <KpiCard
          label="Events / min"
          value={eventsPerMin}
          sub="Average event rate"
          icon={Zap}
          animate={false}
        />
        <KpiCard
          label="Finish rate"
          value={`${finishRate}%`}
          sub="Game completes vs starts"
          icon={Timer}
        />
        <KpiCard
          label="Drop-off"
          value={`${dropOff}%`}
          sub="Started but did not finish"
          icon={AlertCircle}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4" />
                Site traffic
              </CardTitle>
              <CardDescription>Page views by day</CardDescription>
            </div>
            <p className="font-mono text-sm text-muted-foreground tabular-nums">
              {pageViews.toLocaleString()} views
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <TrafficChart byDay={(analytics?.by_day as Array<Record<string, unknown>>) ?? []} />
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="size-4" />
              Signal stream
            </CardTitle>
            <CardDescription>Latest visitor and game activity</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <EventStream
              events={(analytics?.recent as Array<Record<string, unknown>>) ?? []}
              query={search}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MetricListCard
          title="Wins by country"
          description="Daily song correct answers · top regions"
          rows={countryRows}
          valueKey="correct_wins"
          subKey="retention_pct"
        />
        <MetricListCard
          title="Retention by game"
          description="Finish rate per game mode"
          rows={gameRows}
          valueKey="starts"
          subKey="finish_rate"
        />
      </div>
    </div>
  )
}
