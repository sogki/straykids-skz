import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trophy, User } from 'lucide-react'
import { fetchGlobalPlayerLeaderboard } from '@/services/skzPlayerLeaderboard'
import { discordAvatarUrl, startPlayerDiscordOAuth } from '@/services/skzPlayerAuth'
import { usePlayerSessionContext } from '@/context/PlayerSessionContext'
import { LeaderboardSegments } from '@/components/home/LeaderboardSegments'
import LeaderboardPagination, {
  leaderboardTotalPages,
} from '@/components/home/LeaderboardPagination'
import { LEADERBOARD_PAGE_SIZE } from '@/constants/leaderboard'
import '@/styles/pattern-bar.css'

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '30', label: '30 days' },
]

function PlayerRow({ entry, maxPoints, layout }) {
  const points = entry.total_points ?? 0
  const pct = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0
  const avatar = discordAvatarUrl(entry.discord_user_id, entry.avatar_hash, 64)
  const rank = entry.rank ?? '—'
  const isPage = layout === 'page'

  if (isPage) {
    return (
      <li className="lb-page__row">
        <span className="lb-page__row-rank">#{rank}</span>
        <img src={avatar} alt="" width={40} height={40} className="lb-page__row-avatar" />
        <div className="lb-page__row-main">
          <div className="lb-page__row-top">
            <span className="lb-page__row-name">{entry.display_name}</span>
            <span className="lb-page__row-points">
              {points.toLocaleString()} pt{points === 1 ? '' : 's'}
            </span>
          </div>
          <div className="lb-page__row-track" aria-hidden="true">
            <div
              className="lb-page__row-bar"
              style={{ width: `${Math.max(pct, 3)}%` }}
            />
          </div>
        </div>
      </li>
    )
  }

  return (
    <li>
      <div className="stay-board__row-label">
        <div className="stay-board__row-left gap-2">
          <span className="stay-board__rank text-xs font-bold text-zinc-500">
            #{rank}
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

function PlayerAccountCard({ access, connectError, onConnect }) {
  if (access) {
    return (
      <div className="lb-page__card">
        <p className="lb-page__card-label">Your rank</p>
        <div className="flex items-center gap-3">
          <img
            src={discordAvatarUrl(access.discord_user_id, access.avatar_hash, 80)}
            alt=""
            className="size-12 shrink-0 rounded-full ring-2 ring-violet-500/30"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">
              {access.discord_username || access.username}
            </p>
            <p className="text-sm text-zinc-400">
              {access.total_points ?? 0} pts
              {access.global_rank
                ? ` · #${access.global_rank} globally`
                : ' · play a daily to score'}
            </p>
          </div>
        </div>
        <Link to="/profile" className="lb-page__card-link">
          View profile →
        </Link>
      </div>
    )
  }

  return (
    <div className="lb-page__card lb-page__card--cta">
      <User size={20} className="text-violet-300" aria-hidden="true" />
      <p className="text-sm text-zinc-300">
        Connect Discord to earn points on the global board.
      </p>
      <button type="button" className="lb-page__connect-btn" onClick={onConnect}>
        Connect with Discord
      </button>
      {connectError && (
        <p className="text-xs text-red-400" role="alert">
          {connectError}
        </p>
      )}
    </div>
  )
}

export default function PlayerLeaderboard({
  embedded = false,
  layout = embedded ? 'embedded' : 'sidebar',
} = {}) {
  const [period, setPeriod] = useState('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connectError, setConnectError] = useState(null)
  const { access, loading: sessionLoading } = usePlayerSessionContext()

  const isPage = layout === 'page'
  const days = period === '30' ? 30 : null
  const offset = (page - 1) * LEADERBOARD_PAGE_SIZE
  const totalPages = leaderboardTotalPages(data?.total_count, LEADERBOARD_PAGE_SIZE)

  const loadBoard = useCallback(async () => {
    setLoading(true)
    const res = await fetchGlobalPlayerLeaderboard(days, {
      limit: LEADERBOARD_PAGE_SIZE,
      offset,
    })
    setData(res)
    setLoading(false)
  }, [days, offset])

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages)
    }
  }, [page, totalPages])

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

  async function handleConnect() {
    setConnectError(null)
    try {
      await startPlayerDiscordOAuth('/profile')
    } catch (err) {
      setConnectError(err.message || 'Could not start Discord sign-in.')
    }
  }

  const entries = data?.entries ?? []
  const maxPoints = entries[0]?.total_points ?? 1

  const pagination = (
    <LeaderboardPagination
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      compact={!isPage}
      className={isPage ? 'lb-page__pagination' : 'stay-board__pagination'}
    />
  )

  const listContent = loading ? (
    <div className={isPage ? 'lb-page__loading' : 'flex items-center justify-center gap-2 py-12 text-sm text-skz-muted'}>
      <Loader2 size={isPage ? 22 : 18} className="animate-spin" />
      Loading ranks…
    </div>
  ) : entries.length === 0 ? (
    <p className={isPage ? 'lb-page__empty' : 'stay-board__empty'}>
      No player scores yet — link Discord and solve a daily puzzle to appear here.
    </p>
  ) : (
    <ol className={isPage ? 'lb-page__list' : 'stay-board__list'}>
      {entries.map((entry) => (
        <PlayerRow
          key={entry.discord_user_id}
          entry={entry}
          maxPoints={maxPoints}
          layout={layout}
        />
      ))}
    </ol>
  )

  const footnote = (
    <p className={isPage ? 'lb-page__footnote' : 'stay-board__footnote'}>
      {period === '30' ? 'Last 30 days' : 'All time'} · daily wins only
    </p>
  )

  if (isPage) {
    return (
      <div className="lb-page__grid">
        <aside className="lb-page__sidebar">
          <div className="lb-page__sidebar-block">
            <span className="lb-page__sidebar-label">Time range</span>
            <LeaderboardSegments
              options={PERIOD_OPTIONS}
              value={period}
              onChange={(v) => {
                setPeriod(v)
                setPage(1)
              }}
              ariaLabel="Time range"
            />
          </div>
          {!sessionLoading && (
            <PlayerAccountCard
              access={access}
              connectError={connectError}
              onConnect={handleConnect}
            />
          )}
          <p className="lb-page__sidebar-hint">
            1 point per correct daily guess on Song, Member, and Lyric puzzles.
          </p>
        </aside>
        <div className="lb-page__main">
          <div className="lb-page__main-head">
            <span className="lb-page__col-rank">Rank</span>
            <span className="lb-page__col-player">Player</span>
            <span className="lb-page__col-points">Points</span>
          </div>
          {listContent}
          {pagination}
          {footnote}
        </div>
      </div>
    )
  }

  const body = (
    <div className="stay-board__body">
      <div className="stay-board__controls stay-board__controls--period">
        <span className="stay-board__controls-label">Period</span>
        <LeaderboardSegments
          options={PERIOD_OPTIONS}
          value={period}
          onChange={(v) => {
            setPeriod(v)
            setPage(1)
          }}
          size="sm"
          ariaLabel="Time range"
        />
      </div>

      {!sessionLoading && (
        <div className="stay-board__account">
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
                onClick={handleConnect}
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

      {listContent}
      {pagination}
      {footnote}
    </div>
  )

  if (embedded) return body

  return (
    <div className="stay-board">
      <div
        className="skz-pattern-bar skz-pattern-bar--top skz-pattern-bar--compact"
        aria-hidden="true"
      />
      <div className="stay-board__head">
        <div className="stay-board__head-main">
          <div className="stay-board__title-row">
            <Trophy size={17} className="shrink-0 text-white" aria-hidden="true" />
            <h3 className="stay-board__title">Global players</h3>
          </div>
        </div>
      </div>
      {body}
    </div>
  )
}
