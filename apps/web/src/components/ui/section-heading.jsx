import { cn } from '@/lib/utils'

export function SectionHeading({
  label,
  title,
  description,
  className,
  id,
  centered = false,
  labelTone = 'muted',
}) {
  const labelClass =
    labelTone === 'green' || labelTone === 'accent'
      ? 'text-white'
      : 'text-skz-muted'

  return (
    <header
      className={cn(
        'mb-8 md:mb-10',
        centered && 'mx-auto max-w-2xl text-center',
        className
      )}
    >
      {label && (
        <p
          className={cn(
            'mb-2 text-xs font-semibold uppercase tracking-[0.14em]',
            labelClass
          )}
        >
          {label}
        </p>
      )}
      <h2
        id={id}
        className="text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]"
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'mt-2.5 text-sm leading-relaxed text-skz-muted sm:text-base',
            centered && 'mx-auto'
          )}
        >
          {description}
        </p>
      )}
    </header>
  )
}
