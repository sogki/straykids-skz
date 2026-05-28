import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import {
  adminCalloutInfo,
  adminCalloutWarn,
  adminControl,
  adminList,
  adminListRow,
  adminPanel,
} from '@/components/admin/adminUi'
import LeaderboardGameSelect from '@/components/home/LeaderboardGameSelect'
import {
  fetchExcludedCountries,
  getStoredAdminCode,
  purgeCountryAnalytics,
  resetLeaderboard,
  setCountryExcluded,
} from '@/services/skzAdmin'
import { fetchPublicLeaderboard } from '@/services/skzLeaderboard'
import { LEADERBOARD_GAMES } from '@/data/leaderboardGames'
import { countryCodeToFlag, getCountryName } from '@/utils/country'
import { ADMIN_SETUP_INCOMPLETE } from '@/components/admin/adminCopy'

function isMigrationError(message) {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes('function') ||
    m.includes('relation') ||
    m.includes('does not exist') ||
    m.includes('permission denied')
  )
}

export default function LeaderboardAdmin() {
  const code = getStoredAdminCode()
  const [excluded, setExcluded] = useState([])
  const [countryInput, setCountryInput] = useState('GB')
  const [reason, setReason] = useState('Staff / test traffic')
  const [previewGame, setPreviewGame] = useState('guess-song')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [showSql, setShowSql] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, board] = await Promise.all([
        fetchExcludedCountries(code),
        fetchPublicLeaderboard(30, previewGame),
      ])
      setExcluded(Array.isArray(list) ? list : [])
      setPreview(board)
      setShowSql(false)
    } catch (err) {
      setMessage(err.message)
      setShowSql(isMigrationError(err.message))
    } finally {
      setLoading(false)
    }
  }, [code, previewGame])

  useEffect(() => {
    load()
  }, [load])

  async function handleExclude(e) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    setShowSql(false)
    try {
      const list = await setCountryExcluded(code, countryInput, true, reason)
      setExcluded(Array.isArray(list) ? list : [])
      setMessage(
        `${countryInput.toUpperCase()} excluded from the public board. Purge events if old scores still appear in analytics.`
      )
      await load()
    } catch (err) {
      setMessage(err.message)
      setShowSql(isMigrationError(err.message))
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(cc) {
    setBusy(true)
    setMessage(null)
    setShowSql(false)
    try {
      const list = await setCountryExcluded(code, cc, false)
      setExcluded(Array.isArray(list) ? list : [])
      setMessage(`${cc} removed from exclusion list.`)
      await load()
    } catch (err) {
      setMessage(err.message)
      setShowSql(isMigrationError(err.message))
    } finally {
      setBusy(false)
    }
  }

  async function handlePurge() {
    const cc = countryInput.trim().toUpperCase()
    if (
      !window.confirm(
        `Permanently delete ALL analytics events for ${cc}? This cannot be undone.`
      )
    ) {
      return
    }
    setBusy(true)
    setMessage(null)
    setShowSql(false)
    try {
      const res = await purgeCountryAnalytics(code, cc)
      setMessage(`Deleted ${res?.deleted ?? 0} events for ${cc}. Refresh the home page to see the board update.`)
      await load()
    } catch (err) {
      setMessage(err.message)
      setShowSql(isMigrationError(err.message))
    } finally {
      setBusy(false)
    }
  }

  async function handleExcludeAndPurge() {
    const cc = countryInput.trim().toUpperCase()
    if (
      !window.confirm(
        `Exclude ${cc} from the leaderboard and delete all ${cc} analytics events?`
      )
    ) {
      return
    }
    setBusy(true)
    setMessage(null)
    setShowSql(false)
    try {
      await setCountryExcluded(code, cc, true, reason)
      const res = await purgeCountryAnalytics(code, cc)
      setMessage(
        `${cc} excluded and ${res?.deleted ?? 0} events removed. The public board should clear after refresh.`
      )
      await load()
    } catch (err) {
      setMessage(err.message)
      setShowSql(isMigrationError(err.message))
    } finally {
      setBusy(false)
    }
  }

  async function handleResetLeaderboard(scope = 'game') {
    const selected = LEADERBOARD_GAMES.find((g) => g.slug === previewGame)
    const isAll = scope === 'all'
    const confirmText = isAll
      ? 'Reset leaderboard for ALL games? This will delete all tracked game starts and completions.'
      : `Reset leaderboard for ${selected?.label || previewGame}? This will delete tracked starts/completions for that game.`

    if (!window.confirm(confirmText)) return

    setBusy(true)
    setMessage(null)
    setShowSql(false)
    try {
      const res = await resetLeaderboard(code, isAll ? null : previewGame)
      const deleted = res?.deleted ?? 0
      setMessage(
        isAll
          ? `Leaderboard reset for all games. Deleted ${deleted} game analytics rows.`
          : `Leaderboard reset for ${selected?.label || previewGame}. Deleted ${deleted} game analytics rows.`
      )
      await load()
    } catch (err) {
      setMessage(err.message)
      setShowSql(isMigrationError(err.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Leaderboard &amp; test data</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Exclude hides a country on the public board. Purge deletes raw events
          (needed to remove UK test wins). Use both for test traffic.
        </p>
      </div>

      {message && <p className={adminCalloutInfo}>{message}</p>}

      {showSql && (
        <p className={adminCalloutWarn}>
          <span className="font-semibold">Setup required: </span>
          {ADMIN_SETUP_INCOMPLETE}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={adminPanel}>
          <h3 className="text-base font-semibold text-zinc-100">Exclude country</h3>
          <div className="mt-4">
            <form onSubmit={handleExclude} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">
                  ISO code (e.g. GB for United Kingdom)
                </label>
                <input
                  value={countryInput}
                  onChange={(e) => setCountryInput(e.target.value.toUpperCase())}
                  maxLength={2}
                  className={`${adminControl} font-mono uppercase`}
                  placeholder="GB"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Reason (optional)</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={adminControl}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy || countryInput.length !== 2}
                  className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Exclude from leaderboard
                </button>
                <button
                  type="button"
                  disabled={busy || countryInput.length !== 2}
                  onClick={handleExcludeAndPurge}
                  className="rounded-md bg-violet-900 px-4 py-2 text-sm font-semibold text-violet-100 disabled:opacity-50"
                >
                  Exclude + purge
                </button>
                <button
                  type="button"
                  disabled={busy || countryInput.length !== 2}
                  onClick={handlePurge}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 px-4 py-2 text-sm text-red-300 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Purge events only
                </button>
              </div>
            </form>

            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Currently excluded
              </p>
              {loading ? (
                <Loader2 size={18} className="animate-spin text-zinc-500" />
              ) : excluded.length === 0 ? (
                <p className="text-sm text-zinc-500">None — all countries count.</p>
              ) : (
                <ul className={adminList}>
                  {excluded.map((row) => (
                    <li
                      key={row.country_code}
                      className={`${adminListRow} justify-between text-sm`}
                    >
                      <span>
                        {countryCodeToFlag(row.country_code)}{' '}
                        {getCountryName(row.country_code)}{' '}
                        <span className="font-mono text-zinc-500">
                          ({row.country_code})
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleRemove(row.country_code)}
                        className="text-xs text-violet-400 hover:text-violet-300"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className={adminPanel}>
          <h3 className="text-base font-semibold text-zinc-100">Leaderboard preview</h3>
          <div className="mt-4">
            <p className="mb-2 text-xs text-zinc-500">Game</p>
            <LeaderboardGameSelect
              value={previewGame}
              onChange={setPreviewGame}
              options={LEADERBOARD_GAMES}
              className="mb-4 [&_.stay-board__picker-trigger]:rounded-md [&_.stay-board__picker-menu]:rounded-md"
            />
            {loading ? (
              <Loader2 size={18} className="animate-spin text-zinc-500" />
            ) : (
              <ol className={`${adminList} text-sm`}>
                {(preview?.entries ?? []).length === 0 ? (
                  <li className="text-zinc-500">No ranked countries yet.</li>
                ) : (
                  preview.entries.map((entry) => (
                    <li
                      key={entry.country_code}
                      className={`${adminListRow} justify-between py-2`}
                    >
                      <span>
                        {countryCodeToFlag(entry.country_code)}{' '}
                        {getCountryName(entry.country_code)}
                      </span>
                      <span className="font-mono tabular-nums text-zinc-400">
                        {entry.correct_wins}
                      </span>
                    </li>
                  ))
                )}
              </ol>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleResetLeaderboard('game')}
                className="rounded-md border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-200 disabled:opacity-50"
              >
                Reset selected game
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleResetLeaderboard('all')}
                className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 disabled:opacity-50"
              >
                Reset leaderboard (all games)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
