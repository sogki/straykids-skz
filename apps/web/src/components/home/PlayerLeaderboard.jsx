import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trophy, User } from 'lucide-react'
import { fetchGlobalPlayerLeaderboard } from '@/services/skzPlayerLeaderboard'
import { discordAvatarUrl, startPlayerDiscordOAuth } from '@/services/skzPlayerAuth'
import { usePlayerSessionContext } from '@/context/PlayerSessionContext'
import '@/styles/pattern-bar.css'

function PlayerRow({ entry, maxPoints }) {
  const points = entry.total_points ?? 0
  const pct = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0
  const avatar = discordAvatarUrl(entry.discord_user_id, entry.avatar_hash, 64)

  return (
    <li>
      <div className="stay-board__row-label">
        <div className="stay-board__row-left gap-2">
          <span className="stay-board__rank text-xs font-bold text-zinc-500">
            #{entry.rank}
          </span>
          <img
            src={avatar}
            alt=""
            width={28}
            height={28}
            className="size-7 shrink-0 rounded-full ring-1 ring-white/10"
          />
          <span className="stay-board__name truncate">{entry.display_name}</span>
        </div>
        <span className="stay-board__value">{points.toLocaleString()}</span>
      </div>
      <div className="stay-board__track" aria-hidden="true">
        <div
          className="stay-board__bar stay-board__bar--player"
          style={{ width: `${Math.max(pct, 4)}%` }}
          title={`${points} points`}
        />
      </div>
    </li>
  )
}

export default function PlayerLeaderboard({ embedded = false } = {}) {
  const [period, setPeriod] = useState('all')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connectError, setConnectError] = useState(null)
  const { access, loading: sessionLoading } = usePlayerSessionContext()

  const days = period === '30' ? 30 : null

  const loadBoard = useCallback(async () => {
    setLoading(true)
    const res = await fetchGlobalPlayerLeaderboard(days, 25)
    setData(res)
    setLoading(false)
  }, [days])

  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  useEffect(() => {
    function onFocus() {
      loadBoard()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadBoard])

  const entries = data?.entries ?? []
  const maxPoints = entries[0]?.total_points ?? 1

  const inner = (
    <>
      {!embedded && (
        <div
          className="skz-pattern-bar skz-pattern-bar--top skz-pattern-bar--compact"
          aria-hidden="true"
        />
      )}
      <div className={embedded ? 'stay-board__head px-0 pt-0' : 'stay-board__head'}>
        {!embedded && (
          <div className="stay-board__title-row">
            <Trophy size={17} className="shrink-0 text-white" aria-hidden="true" />
            <h3 className="stay-board__title">Global players</h3>
          </div>
        )}
        {!embedded && (
          <>
            <p className="stay-board__desc">
              1 point per correct daily guess (song, member, lyric). Sign in with Discord to
              compete.
            </p>
            <div className="mb-1 flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  period === 'all'
                    ? 'bg-violet-500/25 text-violet-100'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
                onClick={() => setPeriod('all')}
              >
                All time
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  period === '30'
                    ? 'bg-violet-500/25 text-violet-100'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
                onClick={() => setPeriod('30')}
              >
                Last 30 days
              </button>
            </div>
          </>
        )}
      </div>
      <div className="stay-board__body">
        {embedded && (
          <div className="stay-board__filter">
            <p className="stay-board__filter-hint">
              1 point per correct daily guess (song, member, lyric). Sign in with Discord to
              compete.
            </p>
            <span className="stay-board__filter-label">Time range</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  period === 'all'
                    ? 'bg-violet-500/25 text-violet-100'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
                onClick={() => setPeriod('all')}
              >
                All time
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  period === '30'
                    ? 'bg-violet-500/25 text-violet-100'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
                onClick={() => setPeriod('30')}
              >
                Last 30 days
              </button>
            </div>
          </div>
        )}
        {!sessionLoading && (
          <div className="mb-4 rounded-xl border border-zinc-800/90 bg-[#14141a] px-3 py-2.5 text-sm">
            {access ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <img
                    src={discordAvatarUrl(
                      access.discord_user_id,
                      access.avatar_hash,
                      48,
                    )}
                    alt=""
                    className="size-8 shrink-0 rounded-full"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-200">
                      {access.discord_username || access.username}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {access.total_points ?? 0} pts
                      {access.global_rank
                        ? ` · rank #${access.global_rank}`
                        : ' · play a daily to score'}
                    </p>
                  </div>
                </div>
                <Link
                  to="/profile"
                  className="shrink-0 text-xs text-violet-300 hover:text-violet-200"
                >
                  Profile
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-zinc-400">
                  <User size={16} />
                  Link Discord to earn points
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    setConnectError(null)
                    try {
                      await startPlayerDiscordOAuth('/profile')
                    } catch (err) {
                      setConnectError(err.message || 'Could not start Discord sign-in.')
                    }
                  }}
                  className="rounded-lg bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-200 hover:bg-violet-500/30"
                >
                  Connect
                </button>
              </div>
            )}
          </div>
        )}
        {connectError && (
          <p className="mb-3 text-xs text-red-400" role="alert">
            {connectError}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-skz-muted">
            <Loader2 size={18} className="animate-spin" />
            Loading ranks…
          </div>
        ) : entries.length === 0 ? (
          <p className="stay-board__empty">
            No player scores yet — link Discord and solve a daily puzzle to appear here.
          </p>
        ) : (
          <ol className="stay-board__list">
            {entries.map((entry) => (
              <PlayerRow
                key={entry.discord_user_id}
                entry={entry}
                maxPoints={maxPoints}
              />
            ))}
          </ol>
        )}
        <p className="stay-board__footnote">
          {period === '30' ? 'Last 30 days' : 'All time'} · daily wins only
        </p>
      </div>
    </>
  )

  if (embedded) return inner

  return <div className="stay-board">{inner}</div>
}
