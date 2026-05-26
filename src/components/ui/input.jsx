import { cn } from '@/lib/utils'

export function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-skz-border bg-skz-bg px-3 py-2 text-sm text-white',
        'placeholder:text-skz-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}
