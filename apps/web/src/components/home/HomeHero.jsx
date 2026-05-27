import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useMidnightCountdown } from '@/hooks/useMidnightCountdown'
import { getTodayKey, loadDailyState } from '@/utils/dailyPuzzle'

export default function HomeHero({ title, tagline, heroImage, maxGuesses }) {
  const todayKey = getTodayKey()
  const countdown = useMidnightCountdown()

  function isDailyCompleted(gameSlug) {
    const gameKey =
      gameSlug === 'guess-member'
        ? 'member'
        : gameSlug === 'guess-lyric'
          ? 'lyric'
          : 'song'

    const state = loadDailyState(todayKey, gameKey)
    return state?.status === 'won' || state?.status === 'lost'
  }

  const featuredCandidates = [
    {
      slug: 'guess-song',
      title: 'Daily Song Guess',
      emoji: '🎵',
      description: `Name today's track in ${maxGuesses} tries. Each miss unlocks a new clue — emoji, era, lyrics, and more.`,
      href: '/guess-song',
    },
    {
      slug: 'guess-member',
      title: 'Daily Member Guess',
      emoji: '🎭',
      description: `Guess today's member in ${maxGuesses} tries. Wrong answers unlock vibe clues — personality emojis, roles, and more.`,
      href: '/guess-member',
    },
    {
      slug: 'guess-lyric',
      title: 'Daily Lyric Guess',
      emoji: '📝',
      description: `Fill the blank in today's lyric in ${maxGuesses} tries. Wrong answers unlock the next clue.`,
      href: '/guess-lyric',
    },
  ]

  // First one not completed yet. If everything is completed, show song guess again.
  const featured =
    featuredCandidates.find((g) => !isDailyCompleted(g.slug)) ??
    featuredCandidates[0]

  return (
    <section
      className="relative min-h-[min(100vh,920px)] overflow-hidden"
      aria-label="Welcome"
    >
      {!heroImage && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#1a1a1c] to-skz-bg"
          aria-hidden="true"
        />
      )}

      {heroImage && (
        <img
          key={heroImage}
          src={heroImage}
          alt=""
          className="absolute inset-0 z-0 h-full w-full object-cover object-[center_30%]"
        />
      )}

      <div
        className="absolute inset-0 z-[1] bg-gradient-to-b from-black/30 via-black/50 to-skz-bg"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/70 via-black/35 to-transparent lg:to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid min-h-[min(100vh,920px)] w-full max-w-[1120px] grid-cols-1 items-center gap-8 px-5 py-24 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:gap-10 lg:py-20">
        <motion.div
          className="max-w-xl text-left"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white">
            Daily puzzles for STAYs
          </p>
          <h1 className="mb-3 text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[1.1] tracking-tight text-white drop-shadow-md">
            {title}
          </h1>
          <p className="mb-8 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">
            {tagline}
          </p>
          <div className="mb-5 flex flex-wrap gap-2.5">
            <Button asChild variant="default" size="lg">
              <Link to="/guess-song">
                Play today
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/arcade">Browse games</Link>
            </Button>
          </div>
          <p className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/50 px-3 py-2 text-xs tabular-nums text-white/80 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
            {getTodayKey()} · Next puzzle in {countdown}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
          className="w-full lg:justify-self-end"
          aria-labelledby="daily-spotlight"
        >
          <Card className="overflow-hidden border-skz-border/90 bg-skz-surface/95 shadow-xl shadow-black/50 backdrop-blur-md">
            <div className="border-b border-skz-border/60 bg-gradient-to-r from-white/15 to-transparent px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p
                    id="daily-spotlight"
                    className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white"
                  >
                    Featured mode
                  </p>
                  <h2 className="mt-0.5 text-xl font-bold tracking-tight">
                    {featured.title}
                  </h2>
                </div>
                <span className="text-3xl" aria-hidden="true">
                  {featured.emoji}
                </span>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <p className="text-sm leading-relaxed text-skz-muted">
                {featured.description}
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-skz-border/70 bg-skz-bg/80 px-3 py-2.5">
                  <Target className="mb-1 h-3.5 w-3.5 text-white" />
                  <p className="text-sm font-semibold">{maxGuesses} guesses</p>
                  <p className="text-[0.65rem] text-skz-muted">Per round</p>
                </div>
                <div className="rounded-lg border border-skz-border/70 bg-skz-bg/80 px-3 py-2.5">
                  <Clock className="mb-1 h-3.5 w-3.5 text-white" />
                  <p className="text-sm font-semibold">Midnight</p>
                  <p className="text-[0.65rem] text-skz-muted">New puzzle</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <Badge variant="accent">Live today</Badge>
                <Badge>{getTodayKey()}</Badge>
              </div>

              <Button asChild variant="default" size="lg" className="w-full">
                <Link to={featured.href}>
                  Start guessing
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-24 bg-gradient-to-t from-skz-bg to-transparent"
        aria-hidden="true"
      />
    </section>
  )
}
