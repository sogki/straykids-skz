import { useCallback, useEffect, useState } from 'react'
import { Gamepad2, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  fetchAdminGames,
  getStoredAdminCode,
  setGameActive,
} from '@/services/skzAdmin'

const MIGRATION_HINT =
  'Run migration 20250526000017_admin_games_toggle.sql in Supabase, then click Refresh.'

function isMigrationError(message) {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes('skz_admin_list_games') ||
    m.includes('skz_admin_set_game_active') ||
    m.includes('function') ||
    m.includes('does not exist') ||
    m.includes('schema cache')
  )
}

export default function GamesAdmin() {
  const code = getStoredAdminCode()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showHint, setShowHint] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setShowHint(false)
    try {
      const data = await fetchAdminGames(code)
      setRows(data)
    } catch (err) {
      const msg = err.message || 'Could not load games'
      setError(msg)
      setShowHint(isMigrationError(msg))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    load()
  }, [load])

  async function handleToggle(slug, nextActive) {
    setBusy(slug)
    setMessage('')
    setError('')
    try {
      const next = await setGameActive(code, slug, nextActive)
      setRows(next)
      setMessage(`${slug} is now ${nextActive ? 'enabled' : 'disabled'}.`)
    } catch (err) {
      const msg = err.message || 'Update failed'
      setError(msg)
      setShowHint(isMigrationError(msg))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Games</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Toggle minigames on or off. Disabled games are hidden from navigation,
          the arcade, and their public URL is blocked.
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

      {showHint && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <span className="font-semibold">Database migration required: </span>
          {MIGRATION_HINT}
        </p>
      )}

      <Card className="border-white/10 bg-[#111113]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gamepad2 className="size-4 text-violet-400" aria-hidden="true" />
            All games
          </CardTitle>
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading games…
            </p>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-700/80 py-10 text-center text-sm text-zinc-500">
              No games found.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => {
                const enabled = row.is_active !== false
                const isBusy = busy === row.slug
                return (
                  <li
                    key={row.id || row.slug}
                    className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-2xl">
                      <span aria-hidden="true">{row.emoji}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">
                          {row.title}
                        </span>
                        <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                          {row.tag || 'Game'}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            enabled
                              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                              : 'border-zinc-600/40 bg-zinc-700/15 text-zinc-400'
                          }`}
                        >
                          {enabled ? 'Live' : 'Disabled'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {row.path}{' '}
                        <span className="text-zinc-600">·</span> slug:{' '}
                        <code className="text-zinc-400">{row.slug}</code>
                      </p>
                      {row.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                          {row.description}
                        </p>
                      )}
                    </div>
                    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={enabled}
                        disabled={isBusy}
                        onChange={(e) =>
                          handleToggle(row.slug, e.target.checked)
                        }
                      />
                      <span
                        className={`relative h-6 w-11 rounded-full border transition-colors ${
                          enabled
                            ? 'border-emerald-500/50 bg-emerald-500/40'
                            : 'border-zinc-700 bg-zinc-800'
                        } ${isBusy ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${
                            enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </span>
                      <span className="ml-3 text-xs font-medium text-zinc-300">
                        {isBusy ? 'Saving…' : enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
