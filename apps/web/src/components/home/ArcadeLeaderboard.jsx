import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trophy } from 'lucide-react'
import { fetchPublicLeaderboard } from '@/services/skzLeaderboard'
import { LEADERBOARD_GAMES, getLeaderboardGame } from '@/data/leaderboardGames'
import { countryCodeToFlag, getCountryName } from '@/utils/country'
import LeaderboardGameSelect from '@/components/home/LeaderboardGameSelect'
import '@/styles/pattern-bar.css'

function LeaderboardRow({ entry, maxWins }) {
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

export default function ArcadeLeaderboard() {
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
    <div className="stay-board">
      <div
        className="skz-pattern-bar skz-pattern-bar--top skz-pattern-bar--compact"
        aria-hidden="true"
      />
      <div className="stay-board__head">
        <div className="stay-board__title-row">
          <Trophy size={17} className="shrink-0 text-white" aria-hidden="true" />
          <h3 className="stay-board__title">Global STAY board</h3>
        </div>
        <p className="stay-board__desc">{gameMeta.description}</p>
        <LeaderboardGameSelect
          value={gameSlug}
          onChange={setGameSlug}
          options={LEADERBOARD_GAMES}
        />
      </div>
      <div className="stay-board__body">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-skz-muted">
            <Loader2 size={18} className="animate-spin" />
            Loading ranks…
          </div>
        ) : entries.length === 0 ? (
          <p className="stay-board__empty">
            No scores yet for {gameMeta.label} — play today to put your country on
            the board.
          </p>
        ) : (
          <ol className="stay-board__list">
            {entries.map((entry) => (
              <LeaderboardRow
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
    </div>
  )
}
