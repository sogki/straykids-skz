import { Link } from 'react-router-dom'
import { useSkzData } from '@/context/SkzDataContext'
import { getSiteLogoUrl } from '@/services/skzSettings'
import { cn } from '@/lib/utils'

/**
 * @param {'white' | 'black'} variant
 * @param {boolean} showTitle — optional wordmark beside the mark
 */
export default function SiteLogo({
  variant = 'white',
  showTitle = false,
  className,
  imgClassName,
  to = '/',
}) {
  const { settings, supabaseUrl } = useSkzData()
  const title = settings?.site_title || 'SKZ Arcade'
  const src = getSiteLogoUrl(settings, supabaseUrl, variant)

  const content = (
    <>
      <img
        src={src}
        alt={title}
        className={cn('site-logo__img', imgClassName)}
        width={
          imgClassName?.includes('site-logo__img--navbar')
            ? 260
            : imgClassName?.includes('site-logo__img--footer')
              ? 280
              : 140
        }
        height={
          imgClassName?.includes('site-logo__img--navbar')
            ? 56
            : imgClassName?.includes('site-logo__img--footer')
              ? 80
              : 32
        }
        decoding="async"
      />
      {showTitle && <span className="site-logo__title">{title}</span>}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cn('site-logo', className)}>
        {content}
      </Link>
    )
  }

  return <span className={cn('site-logo', className)}>{content}</span>
}
