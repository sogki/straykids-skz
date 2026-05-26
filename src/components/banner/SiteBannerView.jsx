import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import BannerIcon from '@/components/banner/BannerIcon'
import BannerMessage from '@/components/banner/BannerMessage'
import { cn } from '@/lib/utils'
import { buildBannerSurfaceStyle } from '@/utils/bannerTheme'

function BannerCta({ link, label }) {
  if (!link || !label) return null
  if (link.startsWith('http')) {
    return (
      <a
        href={link}
        className="site-banner__cta"
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>
    )
  }
  return (
    <Link to={link} className="site-banner__cta">
      {label}
    </Link>
  )
}

/**
 * Presentational banner (preview + live).
 */
export default function SiteBannerView({
  message,
  link,
  linkLabel,
  icon,
  variant,
  useCustomColors,
  bgColor,
  textColor,
  preview = false,
  onDismiss,
  className,
}) {
  const surfaceStyle = buildBannerSurfaceStyle({
    variant,
    useCustomColors,
    bgColor,
    textColor,
  })

  const isExternal = link?.startsWith('http')
  const wholeRowLink = Boolean(link && !linkLabel)

  const body = (
    <>
      {icon ? (
        <BannerIcon name={icon} className="site-banner__icon shrink-0" size={17} />
      ) : null}
      <BannerMessage message={message} className="site-banner__message" />
      <BannerCta link={link} label={linkLabel} />
    </>
  )

  return (
    <div
      className={cn(
        'site-banner',
        preview && 'site-banner--preview',
        !useCustomColors && `site-banner--${variant}`,
        className
      )}
      style={surfaceStyle}
      role="region"
      aria-label="Site announcement"
    >
      <div className="site-banner__inner">
        {wholeRowLink ? (
          isExternal ? (
            <a
              href={link}
              className="site-banner__link-row"
              target="_blank"
              rel="noopener noreferrer"
            >
              {body}
            </a>
          ) : (
            <Link to={link} className="site-banner__link-row">
              {body}
            </Link>
          )
        ) : (
          <div className="site-banner__content-row">{body}</div>
        )}
        {!preview && onDismiss ? (
          <button
            type="button"
            className="site-banner__dismiss"
            onClick={onDismiss}
            aria-label="Dismiss announcement"
          >
            <X size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
