import { useCallback, useEffect, useState } from 'react'
import { Loader2, Mail, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  fetchSiteRequests,
  getStoredAdminCode,
  updateSiteRequest,
} from '@/services/skzAdmin'

const MIGRATION_SQL = `-- Run in Supabase SQL Editor (migration 20250526000013_site_requests.sql):
-- Creates skz_site_requests + skz_submit_site_request + admin RPCs`

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
]

const TYPE_LABELS = {
  data_correction: 'Data correction',
  takedown: 'Takedown',
  privacy: 'Privacy',
  general: 'General',
  other: 'Other',
}

const STATUS_BADGE = {
  new: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  in_progress: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  dismissed: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function isMigrationError(message) {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes('skz_admin_list_site_requests') ||
    m.includes('skz_site_requests') ||
    m.includes('function') ||
    m.includes('does not exist') ||
    m.includes('schema cache')
  )
}

export default function RequestsAdmin() {
  const code = getStoredAdminCode()
  const [filter, setFilter] = useState('new')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showSql, setShowSql] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [notes, setNotes] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setShowSql(false)
    try {
      const data = await fetchSiteRequests(code, filter || null)
      setRows(data)
    } catch (err) {
      const msg = err.message || 'Could not load requests'
      setError(msg)
      setShowSql(isMigrationError(msg))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [code, filter])

  useEffect(() => {
    load()
  }, [load])

  async function handleStatus(id, status) {
    setBusyId(id)
    setMessage('')
    setError('')
    try {
      await updateSiteRequest(code, id, status, notes[id] ?? undefined)
      setMessage('Request updated.')
      await load()
    } catch (err) {
      setError(err.message || 'Update failed')
      setShowSql(isMigrationError(err.message))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Inbox</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Submissions from the public contact form — corrections, takedowns, and privacy
          requests.
        </p>
      </div>

      {message && (
        <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {showSql && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="mb-2 font-semibold">Database migration required</p>
          <p className="mb-2 text-amber-200/90">
            Run migration <code className="text-xs">20250526000013_site_requests.sql</code> in
            the Supabase SQL Editor, then click Refresh.
          </p>
          <pre className="overflow-x-auto rounded bg-black/40 p-3 text-xs text-zinc-300">
            {MIGRATION_SQL}
          </pre>
        </div>
      )}

      <Card className="border-white/10 bg-[#111113]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4 text-violet-400" aria-hidden="true" />
            Filter
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="admin-select h-9 min-w-[10rem] w-auto"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-50"
              onClick={load}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
              Refresh
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading requests…
            </p>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-700/80 py-10 text-center text-sm text-zinc-500">
              No requests in this filter.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-200">
                        {TYPE_LABELS[row.request_type] || row.request_type}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          STATUS_BADGE[row.status] || STATUS_BADGE.new
                        }`}
                      >
                        {row.status.replace('_', ' ')}
                      </span>
                    </div>
                    <time className="text-xs text-zinc-500">{formatDate(row.created_at)}</time>
                  </div>

                  <p className="mt-2 text-sm text-zinc-200">
                    <span className="font-semibold text-white">{row.name}</span>
                    <span className="text-zinc-500"> · </span>
                    <a
                      href={`mailto:${row.email}`}
                      className="text-violet-300 hover:underline"
                    >
                      {row.email}
                    </a>
                  </p>

                  {row.subject ? (
                    <p className="mt-1 text-sm font-medium text-zinc-300">{row.subject}</p>
                  ) : null}

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                    {expanded === row.id
                      ? row.message
                      : `${row.message.slice(0, 200)}${row.message.length > 200 ? '…' : ''}`}
                  </p>

                  {row.page_url ? (
                    <p className="mt-2">
                      <a
                        href={row.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-400 hover:underline"
                      >
                        Source page ↗
                      </a>
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
                    <button
                      type="button"
                      className="text-xs font-medium text-zinc-400 hover:text-white"
                      onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    >
                      {expanded === row.id ? 'Show less' : 'Show full message'}
                    </button>
                    <select
                      className="admin-select ml-auto h-8 w-auto min-w-[9rem] text-xs"
                      value={row.status}
                      disabled={busyId === row.id}
                      onChange={(e) => handleStatus(row.id, e.target.value)}
                      aria-label="Update status"
                    >
                      {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="mt-3 block">
                    <span className="mb-1 block text-xs font-medium text-zinc-500">
                      Admin notes (saved when status changes)
                    </span>
                    <textarea
                      className="admin-textarea min-h-[4rem] text-sm"
                      value={notes[row.id] ?? row.admin_notes ?? ''}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      rows={2}
                      placeholder="Internal notes…"
                    />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
