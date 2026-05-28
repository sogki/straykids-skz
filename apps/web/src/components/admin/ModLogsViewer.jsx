import { Loader2 } from 'lucide-react'
import {
  getModLogDetailRows,
  modLogEventLabel,
  modLogEventStyle,
} from '@/services/skzAdminBot'

function formatWhen(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const absolute = d.toLocaleString()
  const rel = formatRelative(d)
  return rel ? `${absolute} (${rel})` : absolute
}

function formatRelative(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 48) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 14) return `${day}d ago`
  return null
}

function DetailRow({ label, value, fullWidth, pre, mono }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm text-zinc-200 ${
          pre ? 'whitespace-pre-wrap break-words' : 'break-words'
        } ${mono ? 'font-mono text-xs text-zinc-400' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}

function ModLogCard({ row, channelNameMap }) {
  const details = getModLogDetailRows(row, channelNameMap)
  const badgeClass = modLogEventStyle(row.event_type)

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-800/90 bg-[#111116]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800/80 bg-[#14141a] px-4 py-3">
        <span
          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badgeClass}`}
        >
          {modLogEventLabel(row.event_type)}
        </span>
        <time className="text-xs text-zinc-500" dateTime={row.created_at}>
          {formatWhen(row.created_at)}
        </time>
      </header>
      {details.length > 0 ? (
        <dl className="grid gap-3 px-4 py-3 sm:grid-cols-2">
          {details.map((d, i) => (
            <DetailRow key={`${row.id}-${d.label}-${i}`} {...d} />
          ))}
        </dl>
      ) : (
        <p className="px-4 py-3 text-sm text-zinc-500">No detail recorded for this event.</p>
      )}
    </article>
  )
}

export default function ModLogsViewer({
  rows,
  loading,
  emptyMessage = 'No moderation events yet.',
  channelNameMap,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-zinc-800/90 bg-[#111116] py-16 text-zinc-500">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-zinc-800/90 bg-[#111116] px-4 py-12 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.id}>
          <ModLogCard row={row} channelNameMap={channelNameMap} />
        </li>
      ))}
    </ul>
  )
}
