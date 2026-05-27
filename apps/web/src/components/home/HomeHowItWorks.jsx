import { motion } from 'framer-motion'
import { Music2, Sparkles, Users } from 'lucide-react'
import { SectionHeading } from '@/components/ui/section-heading'
import { SectionShell } from '@/components/ui/section-shell'

const STEPS = [
  {
    icon: Music2,
    step: '01',
    title: 'Open the daily',
    text: 'Same song puzzle for every STAY, refreshed at midnight.',
    accent: '#a855f7',
  },
  {
    icon: Sparkles,
    step: '02',
    title: 'Use your clues',
    text: 'Wrong guesses unlock emoji, era, lyric, and letter hints.',
    accent: '#ffffff',
  },
  {
    icon: Users,
    step: '03',
    title: 'Share & compare',
    text: 'Post your grid and hang out with the community on Discord.',
    accent: '#5865F2',
  },
]

export default function HomeHowItWorks() {
  return (
    <SectionShell
      tone="base"
      hideBottomBorder
      className="!border-b-0"
      aria-labelledby="steps-heading"
    >
      <SectionHeading
        id="steps-heading"
        label="How it works"
        title="Three steps, every day"
        labelTone="accent"
        centered
      />

      <ol className="grid gap-4 md:grid-cols-3 md:gap-5">
        {STEPS.map(({ icon: Icon, step, title, text, accent }, i) => (
          <motion.li
            key={step}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            className="flex flex-col gap-4 rounded-xl border border-skz-border/80 bg-skz-surface/50 p-6 sm:p-7"
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border"
                style={{
                  borderColor: `color-mix(in srgb, ${accent} 40%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
                  color: accent,
                }}
              >
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <span className="text-xs font-bold tabular-nums tracking-wider text-skz-muted">
                {step}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-skz-muted">
                {text}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </SectionShell>
  )
}
