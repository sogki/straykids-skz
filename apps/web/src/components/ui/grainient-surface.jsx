import SkzGrainient from '@/components/backgrounds/SkzGrainient'
import { cn } from '@/lib/utils'

export function GrainientSurface({
  variant = 'card',
  grainientProps,
  children,
  className,
  overlayClassName,
  grainientClassName,
  style,
}) {
  return (
    <div className={cn('relative overflow-hidden', className)} style={style}>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <SkzGrainient
          variant={variant}
          className={cn('h-full w-full opacity-90', grainientClassName)}
          {...grainientProps}
        />
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br from-skz-bg/88 via-skz-bg/78 to-skz-bg/92 backdrop-blur-[1px]',
            overlayClassName
          )}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
