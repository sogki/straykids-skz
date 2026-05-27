import { Loader2 } from 'lucide-react'
import { SectionHeading } from '@/components/ui/section-heading'
import { SectionShell } from '@/components/ui/section-shell'
import GameBentoCard from '@/components/home/GameBentoCard'

export default function HomeGamesBento({ games, loading }) {
  return (
    <SectionShell id="games" tone="fade" tightTop aria-labelledby="games-heading">
      <SectionHeading
        id="games-heading"
        label="Arcade"
        title="More to play"
        description="Beyond the daily — quizzes, profile cards, and more fan modes."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-skz-muted">
          <Loader2 size={22} className="animate-spin" aria-hidden="true" />
          <span>Loading games…</span>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {games.map((game) => (
            <GameBentoCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </SectionShell>
  )
}
