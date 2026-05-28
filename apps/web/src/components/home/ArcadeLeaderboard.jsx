import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trophy, Users } from 'lucide-react'
import { fetchPublicLeaderboard } from '@/services/skzLeaderboard'
import { LEADERBOARD_GAMES, getLeaderboardGame } from '@/data/leaderboardGames'
import { countryCodeToFlag, getCountryName } from '@/utils/country'
import LeaderboardGameSelect from '@/components/home/LeaderboardGameSelect'
import PlayerLeaderboard from '@/components/home/PlayerLeaderboard'
import '@/styles/pattern-bar.css'

function CountryLeaderboardRow({ entry, maxWins }) {
  const wins = entry.correct_wins ?? 0
  const pct = maxWins > 0 ? Math.round((wins / maxWins) * 100) : 0

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

function CountryLeaderboard() {
  const [gameSlug, setGameSlug] = useState(LEADERBOARD_GAMES[0].slug)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const gameMeta = getLeaderboardGame(gameSlug)

  const loadBoard = useCallback(async () => {
    setLoading(true)
    const res = await fetchPublicLeaderboard(30, gameSlug)
    setData(res)
    setLoading(false)
    return res
  }, [gameSlug])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await fetchPublicLeaderboard(30, gameSlug)
      if (!cancelled) {
        setData(res)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [gameSlug])

  useEffect(() => {
    function onFocus() {
      loadBoard()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadBoard])

  const entries = data?.entries ?? []
  const maxWins = entries[0]?.correct_wins ?? 1

  return (
    <div className="stay-board__body">
      <div className="stay-board__filter">
        <label className="stay-board__filter-label" htmlFor="leaderboard-game-select">
          Game mode
        </label>
        <LeaderboardGameSelect
          id="leaderboard-game-select"
          value={gameSlug}
          onChange={setGameSlug}
          options={LEADERBOARD_GAMES}
        />
        <p className="stay-board__filter-hint">{gameMeta.description}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-skz-muted">
          <Loader2 size={18} className="animate-spin" />
          Loading ranks…
        </div>
      ) : entries.length === 0 ? (
        <p className="stay-board__empty">
          No scores yet for {gameMeta.label} — play today to put your country on the board.
        </p>
      ) : (
        <ol className="stay-board__list">
          {entries.map((entry) => (
            <CountryLeaderboardRow
              key={entry.country_code}
              entry={entry}
              maxWins={maxWins}
            />
          ))}
        </ol>
      )}
      <p className="stay-board__footnote">
        Top countries by {gameMeta.winLabel} · last {data?.days ?? 30} days
      </p>
    </div>
  )
}

export default function ArcadeLeaderboard() {
  const [tab, setTab] = useState('players')

  return (
    <div className="stay-board">
      <div
        className="skz-pattern-bar skz-pattern-bar--top skz-pattern-bar--compact"
        aria-hidden="true"
      />
      <div className="stay-board__head">
        <div className="stay-board__title-row">
          <Trophy size={17} className="shrink-0 text-white" aria-hidden="true" />
          <h3 className="stay-board__title">Leaderboard</h3>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTab('players')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === 'players'
                ? 'bg-violet-500/25 text-violet-100 ring-1 ring-violet-500/40'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users size={14} />
            Players
          </button>
          <button
            type="button"
            onClick={() => setTab('countries')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === 'countries'
                ? 'bg-violet-500/25 text-violet-100 ring-1 ring-violet-500/40'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Countries
          </button>
        </div>
      </div>

      {tab === 'players' ? (
        <PlayerLeaderboard embedded />
      ) : (
        <CountryLeaderboard />
      )}

      {tab === 'players' && (
        <p className="px-4 pb-3 text-center text-[11px] text-zinc-600">
          <Link to="/link" className="text-violet-400 hover:underline">
            Account
          </Link>
        </p>
      )}
    </div>
  )
}
