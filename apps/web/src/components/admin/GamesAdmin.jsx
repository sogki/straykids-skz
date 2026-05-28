import { useCallback, useEffect, useState } from 'react'
import { Gamepad2, Loader2, RefreshCw } from 'lucide-react'
import AdminSwitch from '@/components/admin/AdminSwitch'
import {
  adminBtnSecondary,
  adminCalloutError,
  adminCalloutInfo,
  adminCalloutWarn,
  adminEmpty,
  adminList,
  adminListRow,
  adminPanel,
} from '@/components/admin/adminUi'
import {
  fetchAdminGames,
  getStoredAdminCode,
  setGameActive,
} from '@/services/skzAdmin'
import { ADMIN_SETUP_INCOMPLETE } from '@/components/admin/adminCopy'

const MIGRATION_HINT = ADMIN_SETUP_INCOMPLETE

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

      {message && <p className={adminCalloutInfo}>{message}</p>}

      {error && <p className={adminCalloutError}>{error}</p>}

      {showHint && (
        <p className={adminCalloutWarn}>
          <span className="font-semibold">Setup required: </span>
          {MIGRATION_HINT}
        </p>
      )}

      <div className={adminPanel}>
        <div className="admin-subsection__head">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
              <Gamepad2 className="size-4 text-violet-400" aria-hidden="true" />
              All games
            </h3>
          </div>
          <button
            type="button"
            className={adminBtnSecondary}
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
        <div className="mt-4">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading games…
            </p>
          ) : rows.length === 0 ? (
            <p className={adminEmpty}>No games found.</p>
          ) : (
            <ul className={adminList}>
              {rows.map((row) => {
                const enabled = row.is_active !== false
                const isBusy = busy === row.slug
                return (
                  <li key={row.id || row.slug} className={adminListRow}>
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 text-2xl">
                      <span aria-hidden="true">{row.emoji}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-white">{row.title}</span>
                            <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                              {row.tag || 'Game'}
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
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <AdminSwitch
                            checked={enabled}
                            disabled={isBusy}
                            onChange={(next) => handleToggle(row.slug, next)}
                            aria-label={`${enabled ? 'Disable' : 'Enable'} ${row.title}`}
                          />
                          <span className="text-[10px] font-medium text-zinc-500">
                            {isBusy ? 'Saving…' : enabled ? 'On' : 'Off'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
