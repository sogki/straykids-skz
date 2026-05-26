import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-skz-border bg-skz-bg text-skz-muted',
        green:
          'border-white/40 bg-white/10 text-white',
        accent:
          'border-white/40 bg-white/10 text-white',
        discord:
          'border-[#5865F2]/40 bg-[#5865F2]/10 text-[#8b9cff]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
