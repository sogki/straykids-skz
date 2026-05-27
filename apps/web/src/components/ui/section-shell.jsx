import { cn } from '@/lib/utils'

const tones = {
  base: 'bg-skz-bg',
  surface:
    'bg-skz-surface/40 border-y border-skz-border/80 backdrop-blur-sm',
  fade: 'bg-gradient-to-b from-skz-bg via-skz-surface/30 to-skz-bg',
  discord:
    'bg-gradient-to-b from-skz-bg via-[#5865F2]/[0.07] to-skz-bg',
}

export function SectionShell({
  children,
  className,
  id,
  tone = 'base',
  tightTop = false,
  contained = true,
  hideBottomBorder = false,
  ...props
}) {
  return (
    <section
      id={id}
      {...props}
      className={cn(
        'relative isolate overflow-hidden px-5',
        tightTop ? 'pt-10 pb-14 md:pt-12 md:pb-16' : 'py-14 md:py-16',
        tones[tone],
        hideBottomBorder && tone === 'surface' && 'border-b-0',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-skz-border/80 to-transparent"
        aria-hidden="true"
      />
      {contained ? (
        <div className="relative mx-auto max-w-[1120px]">{children}</div>
      ) : (
        children
      )}
    </section>
  )
}
