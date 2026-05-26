import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default function GameBentoCard({ game }) {
  const accent = game.color || '#ffffff'

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <Link
        to={game.path}
        className="group relative flex h-[200px] flex-col overflow-hidden rounded-xl border border-skz-border/90 bg-skz-surface/80 p-5 backdrop-blur-sm transition-colors hover:border-skz-muted/60 hover:bg-skz-surface"
        style={{ borderTopWidth: 2, borderTopColor: accent }}
      >
        <div
          className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-40"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />

        <div className="relative flex items-start justify-between">
          <span className="text-3xl leading-none">{game.emoji}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-skz-border bg-skz-bg/80 text-skz-muted transition-colors group-hover:text-white">
            <ArrowUpRight size={15} aria-hidden="true" />
          </span>
        </div>

        <div className="relative mt-auto pt-6">
          {game.tag && <Badge className="mb-2.5">{game.tag}</Badge>}
          <h3 className="text-lg font-bold tracking-tight">{game.title}</h3>
          <p
            className="mt-1.5 line-clamp-1 text-sm leading-relaxed text-skz-muted"
            title={game.description}
          >
            {game.description}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
