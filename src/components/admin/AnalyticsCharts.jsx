import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { countryCodeToFlag, getCountryName } from '@/utils/country'

function DayChart({ byDay = [] }) {
  const max = Math.max(1, ...byDay.map((d) => d.page_views ?? 0))

  if (byDay.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        No page views yet — traffic will appear here as visitors browse the site.
      </p>
    )
  }

  return (
    <div className="flex h-48 items-end gap-1.5 pt-4">
      {byDay.map((d) => {
        const h = ((d.page_views ?? 0) / max) * 100
        return (
          <div
            key={d.day}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <span className="font-mono text-[10px] text-zinc-500">
              {d.page_views ?? 0}
            </span>
            <div
              className="w-full max-w-[40px] rounded-t bg-violet-500/80 transition-all"
              style={{ height: `${Math.max(h, 4)}%` }}
              title={`${d.day}: ${d.page_views} views`}
            />
            <span className="truncate text-[9px] text-zinc-600">
              {d.day?.slice(5)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function GameTable({ byGame = [] }) {
  if (byGame.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        No game events yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-zinc-500">
            <th className="pb-2 font-medium">Game</th>
            <th className="pb-2 font-medium text-right">Starts</th>
            <th className="pb-2 font-medium text-right">Completes</th>
            <th className="pb-2 font-medium text-right">Wins</th>
          </tr>
        </thead>
        <tbody>
          {byGame.map((g) => (
            <tr key={g.game_slug} className="border-b border-white/5">
              <td className="py-2.5 font-medium text-white">{g.game_slug}</td>
              <td className="py-2.5 text-right font-mono tabular-nums">
                {g.starts ?? 0}
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums">
                {g.completes ?? 0}
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums text-emerald-400/90">
                {g.wins ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EventStream({ recent = [] }) {
  if (recent.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">No recent events.</p>
    )
  }

  return (
    <ul className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs">
      {recent.map((ev, i) => (
        <li
          key={`${ev.created_at}-${i}`}
          className="flex flex-wrap items-center gap-2 rounded border border-white/5 bg-black/30 px-2 py-1.5"
        >
          <span
            className={
              ev.event_type === 'page_view'
                ? 'text-sky-400'
                : ev.event_type === 'game_start'
                  ? 'text-violet-400'
                  : 'text-emerald-400'
            }
          >
            {ev.event_type}
          </span>
          <span className="text-zinc-500">{ev.path || ev.game_slug || '—'}</span>
          {ev.country_code && (
            <span className="text-amber-500/80">{ev.country_code}</span>
          )}
          <span className="ml-auto text-zinc-600">
            {new Date(ev.created_at).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  )
}

function CountryTable({ byCountry = [], excluded = [] }) {
  if (byCountry.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">No country data yet.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-zinc-500">
            <th className="pb-2 font-medium">Country</th>
            <th className="pb-2 font-medium text-right">Events</th>
            <th className="pb-2 font-medium text-right">Song wins</th>
            <th className="pb-2 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {byCountry.map((c) => {
            const isExcluded = excluded.includes(c.country_code)
            return (
              <tr key={c.country_code} className="border-b border-white/5">
                <td className="py-2.5">
                  {countryCodeToFlag(c.country_code)}{' '}
                  {getCountryName(c.country_code)}
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums">
                  {c.events ?? 0}
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums">
                  {c.song_wins ?? 0}
                </td>
                <td className="py-2.5 text-right text-xs">
                  {isExcluded ? (
                    <span className="text-amber-400">Excluded</span>
                  ) : (
                    <span className="text-zinc-500">Counts</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function AnalyticsCharts({ analytics }) {
  const excluded = analytics?.excluded_countries ?? []

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <Card className="border-white/10 bg-[#111113] lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Page views by day</CardTitle>
        </CardHeader>
        <CardContent>
          <DayChart byDay={analytics?.by_day ?? []} />
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#111113]">
        <CardHeader>
          <CardTitle className="text-base">Games by starts</CardTitle>
        </CardHeader>
        <CardContent>
          <GameTable byGame={analytics?.by_game ?? []} />
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#111113]">
        <CardHeader>
          <CardTitle className="text-base">By country (raw)</CardTitle>
        </CardHeader>
        <CardContent>
          <CountryTable
            byCountry={analytics?.by_country ?? []}
            excluded={excluded}
          />
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#111113] lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <EventStream recent={analytics?.recent ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
