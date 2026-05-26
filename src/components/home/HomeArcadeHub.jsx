import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/ui/section-heading'
import { SectionShell } from '@/components/ui/section-shell'
import ArcadeLeaderboard from '@/components/home/ArcadeLeaderboard'
import {
  CATEGORY_IDS,
  CATEGORY_LABELS,
  gameCategoryId,
} from '@/utils/gameTheme'
import { cn } from '@/lib/utils'
import '@/styles/HomeArcadeHub.css'
import '@/styles/pattern-bar.css'

/** Page size for the games grid — uniform 2-column cards, 6 per page. */
const PAGE_SIZE = 6

function GameCard({ game }) {
  const accent = game.color || '#ffffff'

  return (
    <motion.article
      className={cn('arcade-card')}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <Link
        to={game.path}
        className="arcade-card__inner"
        style={{ '--card-accent': accent }}
      >
        <div className="arcade-card__top">
          <span className="arcade-card__emoji" aria-hidden="true">
            {game.emoji}
          </span>
          {game.tag && (
            <span className="arcade-card__tag">{game.tag}</span>
          )}
        </div>
        <div className="arcade-card__content">
          <h3 className="arcade-card__title">{game.title}</h3>
          <p className="arcade-card__desc">{game.description}</p>
        </div>
        <span className="arcade-card__cta">
          Play
          <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" />
        </span>
      </Link>
    </motion.article>
  )
}

function CategoryFilter({ value, onChange, counts }) {
  return (
    <div
      className="arcade-hub__filters"
      role="tablist"
      aria-label="Game categories"
    >
      {CATEGORY_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'arcade-hub__filter',
            value === id && 'arcade-hub__filter--active'
          )}
        >
          {CATEGORY_LABELS[id]}
          <span className="arcade-hub__filter-count">{counts[id] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}

export default function HomeArcadeHub({ games, loading }) {
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)

  const counts = useMemo(() => {
    const c = { all: games.length, daily: 0, quiz: 0, creative: 0 }
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safePage])

  function handleCategoryChange(id) {
    setCategory(id)
    setPage(1)
  }

  return (
    <SectionShell
      id="games"
      tone="surface"
      contained={false}
      className="arcade-hub-section !px-0 !py-0"
      aria-labelledby="arcade-heading"
    >
      <div className="arcade-hub">
        <div className="arcade-hub__main">
          <header className="arcade-hub__header">
            <SectionHeading
              id="arcade-heading"
              label="Arcade"
              labelTone="accent"
              title="Games"
              description="Daily puzzles, quizzes, and creative tools — pick a mode to play."
            />
            {!loading && games.length > 0 && (
              <CategoryFilter
                value={category}
                onChange={handleCategoryChange}
                counts={counts}
              />
            )}
          </header>

          <div className="arcade-hub__games">
            {loading ? (
              <div className="arcade-hub__state">
                <Loader2 size={22} className="animate-spin text-skz-muted" />
                <span className="text-skz-muted">Loading games…</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="arcade-hub__state text-sm text-skz-muted">
                No games in this category yet.
              </p>
            ) : (
              <>
                <div className="arcade-hub__grid">
                  {paged.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav
                    className="arcade-hub__pagination"
                    aria-label="Games pagination"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </Button>
                    <span className="text-sm text-skz-muted">
                      Page {safePage} of {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                      <ChevronRight size={16} />
                    </Button>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>

        <aside
          className="arcade-hub__leaderboard"
          aria-label="Global leaderboard"
        >
          <ArcadeLeaderboard />
        </aside>
      </div>
    </SectionShell>
  )
}
