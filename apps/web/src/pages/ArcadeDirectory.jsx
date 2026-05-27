import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useSkzData } from '@/context/SkzDataContext'
import GameBentoCard from '@/components/home/GameBentoCard'
import { SectionHeading } from '@/components/ui/section-heading'
import {
  CATEGORY_IDS,
  CATEGORY_LABELS,
  gameCategoryId,
} from '@/utils/gameTheme'
import { cn } from '@/lib/utils'
import '@/styles/ArcadeDirectory.css'

function CategoryFilter({ value, onChange, counts }) {
  return (
    <div
      className="arcade-dir__filters"
      role="tablist"
      aria-label="Filter games"
    >
      {CATEGORY_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'arcade-dir__filter',
            value === id && 'arcade-dir__filter--active'
          )}
        >
          {CATEGORY_LABELS[id]}
          <span className="arcade-dir__filter-count">{counts[id] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}

export default function ArcadeDirectory() {
  const { games, loading } = useSkzData()
  const [category, setCategory] = useState('all')

  const counts = useMemo(() => {
    const c = { all: games.length, daily: 0, minigame: 0, quiz: 0, creative: 0 }
    games.forEach((g) => {
      const id = gameCategoryId(g)
      if (c[id] !== undefined) c[id] += 1
    })
    return c
  }, [games])

  const filtered = useMemo(() => {
    if (category === 'all') return games
    return games.filter((g) => gameCategoryId(g) === category)
  }, [games, category])

  return (
    <div className="arcade-dir">
      <Link to="/" className="arcade-dir__home-link">
        <ArrowLeft size={18} strokeWidth={2.25} aria-hidden="true" />
        Home
      </Link>

      <SectionHeading
        label="SKZ Arcade"
        title="Browse the arcade"
        description="Every minigame and daily puzzle in one place. Pick a mode and play."
        className="arcade-dir__heading"
      />

      <CategoryFilter
        value={category}
        onChange={setCategory}
        counts={counts}
      />

      <p className="arcade-dir__notice" role="status">
        We&apos;re creating games as we go — expect more here soon.
      </p>

      {loading ? (
        <p className="arcade-dir__status" role="status">
          <Loader2 className="arcade-dir__spin" size={18} aria-hidden="true" />
          Loading games…
        </p>
      ) : filtered.length === 0 ? (
        <p className="arcade-dir__status">No games in this category yet.</p>
      ) : (
        <ul className="arcade-dir__grid">
          {filtered.map((game) => (
            <li key={game.id}>
              <GameBentoCard game={game} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
