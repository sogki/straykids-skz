import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trophy, Users } from 'lucide-react'
import { fetchPublicLeaderboard } from '@/services/skzLeaderboard'
import { LEADERBOARD_GAMES, getLeaderboardGame } from '@/data/leaderboardGames'
import { countryCodeToFlag, getCountryName } from '@/utils/country'
import LeaderboardGameSelect from '@/components/home/LeaderboardGameSelect'
import { LeaderboardSegments } from '@/components/home/LeaderboardSegments'
import PlayerLeaderboard from '@/components/home/PlayerLeaderboard'
import LeaderboardPagination, {
  leaderboardTotalPages,
} from '@/components/home/LeaderboardPagination'
import { LEADERBOARD_PAGE_SIZE } from '@/constants/leaderboard'
import { usePlayerSessionContext } from '@/context/PlayerSessionContext'
import '@/styles/pattern-bar.css'
import '@/styles/LeaderboardPage.css'

const BOARD_TABS = [
  { value: 'players', label: 'Players', icon: <Users size={13} aria-hidden="true" /> },
  { value: 'countries', label: 'Countries' },
]

const PLAYERS_HINT =
  '1 point per correct daily guess (song, member, lyric). Sign in with Discord to compete.'

function CountryRow({ entry, maxWins, layout }) {
  const wins = entry.correct_wins ?? 0
  const pct = maxWins > 0 ? Math.round((wins / maxWins) * 100) : 0

  if (layout === 'page') {
    return (
      <li className="lb-page__row lb-page__row--country">
        <span className="lb-page__row-flag" aria-hidden="true">
          {countryCodeToFlag(entry.country_code)}
        </span>
        <div className="lb-page__row-main">
          <div className="lb-page__row-top">
            <span className="lb-page__row-name">
              {getCountryName(entry.country_code)}
            </span>
            <span className="lb-page__row-points">
              {wins.toLocaleString()} win{wins === 1 ? '' : 's'}
            </span>
          </div>
          <div className="lb-page__row-track" aria-hidden="true">
            <div className="lb-page__row-bar" style={{ width: `${Math.max(pct, 3)}%` }} />
          </div>
        </div>
      </li>
    )
  }

  return (
    <li>
      <div className="stay-board__row-label">
        <div className="stay-board__row-left">
          <span className="stay-board__flag" aria-hidden="true">
            {countryCodeToFlag(entry.country_code)}
          </span>
          <span className="stay-board__name">
            {getCountryName(entry.country_code)}
          </span>
        </div>
        <span className="stay-board__value">{wins.toLocaleString()}</span>
      </div>
      <div className="stay-board__track" aria-hidden="true">
        <div
          className="stay-board__bar"
          style={{ width: `${Math.max(pct, 4)}%` }}
          title={`${wins} wins`}
        />
      </div>
    </li>
  )
}

function CountryLeaderboard({ layout = 'sidebar' }) {
  const [gameSlug, setGameSlug] = useState(LEADERBOARD_GAMES[0].slug)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const isPage = layout === 'page'
  const offset = (page - 1) * LEADERBOARD_PAGE_SIZE
  const totalPages = leaderboardTotalPages(data?.total_count, LEADERBOARD_PAGE_SIZE)

  const gameMeta = getLeaderboardGame(gameSlug)

  const loadBoard = useCallback(async () => {
    setLoading(true)
    const res = await fetchPublicLeaderboard(30, gameSlug, {
      limit: LEADERBOARD_PAGE_SIZE,
      offset,
    })
    setData(res)
    setLoading(false)
    return res
  }, [gameSlug, offset])

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await fetchPublicLeaderboard(30, gameSlug, {
        limit: LEADERBOARD_PAGE_SIZE,
        offset,
      })
      if (!cancelled) {
        setData(res)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [gameSlug, offset])

  useEffect(() => {
    function onFocus() {
      loadBoard()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadBoard])

  const entries = data?.entries ?? []
  const maxWins = entries[0]?.correct_wins ?? 1

  const listContent = loading ? (
    <div className={isPage ? 'lb-page__loading' : 'flex items-center justify-center gap-2 py-12 text-sm text-skz-muted'}>
      {isPage ? (
        <>
          <Loader2 size={22} className="animate-spin" />
          Loading ranks…
        </>
      ) : (
        <>
          <Loader2 size={18} className="animate-spin" />
          Loading ranks…
        </>
      )}
    </div>
  ) : entries.length === 0 ? (
    <p className={isPage ? 'lb-page__empty' : 'stay-board__empty'}>
      No scores yet for {gameMeta.label} — play today to put your country on the board.
    </p>
  ) : (
    <ol className={isPage ? 'lb-page__list' : 'stay-board__list'}>
      {entries.map((entry) => (
        <CountryRow
          key={entry.country_code}
          entry={entry}
          maxWins={maxWins}
          layout={layout}
        />
      ))}
    </ol>
  )

  const footnote = (
    <p className={isPage ? 'lb-page__footnote' : 'stay-board__footnote'}>
      Top countries by {gameMeta.winLabel} · last {data?.days ?? 30} days
    </p>
  )

  const pagination = (
    <LeaderboardPagination
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      compact={!isPage}
      className={isPage ? 'lb-page__pagination' : 'stay-board__pagination'}
    />
  )

  if (isPage) {
    return (
      <div className="lb-page__grid">
        <aside className="lb-page__sidebar">
          <div className="lb-page__sidebar-block">
            <label
              className="lb-page__sidebar-label"
              htmlFor="leaderboard-page-game-select"
            >
              Game mode
            </label>
            <LeaderboardGameSelect
              id="leaderboard-page-game-select"
              value={gameSlug}
              onChange={(slug) => {
                setGameSlug(slug)
                setPage(1)
              }}
              options={LEADERBOARD_GAMES}
            />
            <p className="lb-page__sidebar-hint">{gameMeta.description}</p>
          </div>
        </aside>
        <div className="lb-page__main">
          <div className="lb-page__main-head lb-page__main-head--country">
            <span className="lb-page__col-player">Country</span>
            <span className="lb-page__col-points">Wins</span>
          </div>
          {listContent}
          {pagination}
          {footnote}
        </div>
      </div>
    )
  }

  return (
    <div className="stay-board__body">
      <div className="stay-board__controls">
        <label className="stay-board__controls-label" htmlFor="leaderboard-game-select">
          Game
        </label>
        <LeaderboardGameSelect
          id="leaderboard-game-select"
          value={gameSlug}
          onChange={(slug) => {
            setGameSlug(slug)
            setPage(1)
          }}
          options={LEADERBOARD_GAMES}
        />
        <p className="stay-board__controls-hint">{gameMeta.description}</p>
      </div>
      {listContent}
      {pagination}
      {footnote}
    </div>
  )
}

export default function ArcadeLeaderboard({ layout = 'sidebar' }) {
  const [tab, setTab] = useState('players')
  const { access } = usePlayerSessionContext()
  const isPage = layout === 'page'

  if (isPage) {
    return (
      <div className="lb-page">
        <header className="lb-page__hero">
          <div className="lb-page__hero-text">
            <p className="lb-page__eyebrow">Rankings</p>
            <h1 className="lb-page__title">Leaderboard</h1>
            <p className="lb-page__subtitle">
              Global player points from daily puzzles, plus country rankings by game.
              Connect Discord on your{' '}
              <Link to="/profile" className="lb-page__inline-link">
                profile
              </Link>{' '}
              to compete.
            </p>
          </div>
          <LeaderboardSegments
            options={BOARD_TABS}
            value={tab}
            onChange={setTab}
            ariaLabel="Leaderboard type"
          />
        </header>

        <div className="lb-page__panel">
          {tab === 'players' ? (
            <PlayerLeaderboard layout="page" />
          ) : (
            <CountryLeaderboard layout="page" />
          )}
        </div>
      </div>
    )
  }

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
            <h3 className="stay-board__title">Leaderboard</h3>
          </div>
          <LeaderboardSegments
            options={BOARD_TABS}
            value={tab}
            onChange={setTab}
            ariaLabel="Leaderboard type"
          />
        </div>
        {tab === 'players' && (
          <p className="stay-board__head-hint">{PLAYERS_HINT}</p>
        )}
      </div>

      {tab === 'players' ? (
        <PlayerLeaderboard embedded />
      ) : (
        <CountryLeaderboard layout="sidebar" />
      )}

      {tab === 'players' && access && (
        <p className="stay-board__foot-link">
          <Link to="/profile" className="text-violet-400 hover:underline">
            Account
          </Link>
        </p>
      )}
    </div>
  )
}
