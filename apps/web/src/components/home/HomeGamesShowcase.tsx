import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ArrowRight } from 'lucide-react'
import CardSwap, { Card } from '@/components/animations/CardSwap'
import GameSwapCard from '@/components/home/game-previews/GameSwapCard'
import type { SkzGame } from '@/types/game'

interface HomeGamesShowcaseProps {
  games: SkzGame[]
  loading: boolean
}

/**
 * React Bits Card Swap — official props & stage size:
 * https://reactbits.dev/components/card-swap
 */
export default function HomeGamesShowcase({
  games,
  loading,
}: HomeGamesShowcaseProps) {
  const [frontIndex, setFrontIndex] = useState(0)
  const [playIndex, setPlayIndex] = useState(0)
  const [uiReady, setUiReady] = useState(true)

  const handleFrontChange = useCallback((index: number) => {
    setFrontIndex(index)
    setPlayIndex(index)
    setUiReady(true)
  }, [])

  const handleSwapStart = useCallback(() => {
    setUiReady(false)
  }, [])

  const activeGame = games[frontIndex] ?? games[playIndex]

  return (
    <section id="games" className="skz-games-section bg-skz-bg py-12 lg:py-16">
      <div className="mx-auto max-w-[1120px] px-5">
        <div className="skz-games-row">
          <div className="skz-games-row__copy">
            <p className="skz-games-eyebrow">Arcade</p>
            <p className="mb-6 text-sm text-skz-muted">
              The stack rotates every few seconds. Hover the cards to pause. The
              highlighted game matches the front card.
            </p>

            {loading ? (
              <div className="flex items-center gap-2 text-skz-muted">
                <Loader2 size={20} className="animate-spin" />
                <span>Loading…</span>
              </div>
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Games">
                {games.map((game, index) => (
                  <li key={game.id}>
                    <button
                      type="button"
                      onClick={() => setPlayIndex(index)}
                      className={`w-full max-w-sm rounded-lg border px-4 py-3 text-left transition-colors ${
                        index === frontIndex
                          ? 'border-white/30 bg-white/[0.06] text-white'
                          : 'border-transparent text-skz-muted hover:border-skz-border hover:text-white'
                      }`}
                    >
                      <span className="mr-2">{game.emoji}</span>
                      {game.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {activeGame && !loading && (
              <Link
                to={activeGame.path}
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-skz-bg"
              >
                Play {activeGame.title}
                <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {!loading && games.length > 0 && (
            <div className="skz-games-row__swap">
              <CardSwap
                width={500}
                height={400}
                cardDistance={60}
                verticalDistance={70}
                delay={5000}
                pauseOnHover
                onSwapStart={handleSwapStart}
                onFrontChange={handleFrontChange}
                onCardClick={setPlayIndex}
              >
                {games.map((game, index) => (
                  <Card key={game.id}>
                    <GameSwapCard
                      game={game}
                      isFront={uiReady && frontIndex === index}
                    />
                  </Card>
                ))}
              </CardSwap>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
