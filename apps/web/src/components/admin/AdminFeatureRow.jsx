import { ChevronRight } from 'lucide-react'
import AdminSwitch from '@/components/admin/AdminSwitch'
import { adminFeatureCard, adminFeatureRow } from '@/components/admin/adminUi'

/**
 * Hub / navigation row or grid card: icon, title, optional switch, open action.
 * @param {'row' | 'card'} [layout='row'] — card for bot settings hub grid
 */
export default function AdminFeatureRow({
  icon: Icon,
  iconBg,
  title,
  description,
  meta,
  onOpen,
  switch: switchProps,
  layout = 'row',
}) {
  const hasSwitch = Boolean(switchProps)

  if (layout === 'card') {
    return (
      <article className={adminFeatureCard}>
        <button type="button" onClick={onOpen} className="admin-feature-card__main">
          <div className="admin-feature-card__top">
            {Icon ? (
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
            ) : null}
            <ChevronRight className="admin-feature-card__chevron" aria-hidden />
          </div>
          <span className="admin-feature-card__title">{title}</span>
          {description ? (
            <span className="admin-feature-card__desc">{description}</span>
          ) : null}
          {meta ? <span className="admin-feature-card__meta">{meta}</span> : null}
        </button>
        {hasSwitch ? (
          <div
            className="admin-feature-card__switch"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <AdminSwitch
              checked={switchProps.checked}
              onChange={switchProps.onChange}
              disabled={switchProps.disabled}
              aria-label={switchProps.ariaLabel || `Enable ${title}`}
            />
          </div>
        ) : null}
      </article>
    )
  }

  return (
    <div className={adminFeatureRow}>
      {Icon ? (
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
          aria-hidden
        >
          <Icon className="size-5" />
        </span>
      ) : (
        <span className="admin-feature-row__icon-spacer" aria-hidden />
      )}

      <button type="button" onClick={onOpen} className="admin-feature-row__main">
        <span className="admin-feature-row__title">{title}</span>
        {description ? (
          <span className="admin-feature-row__desc">{description}</span>
        ) : null}
        {meta ? <span className="admin-feature-row__meta">{meta}</span> : null}
      </button>

      <div
        className="admin-feature-row__switch"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {hasSwitch ? (
          <AdminSwitch
            checked={switchProps.checked}
            onChange={switchProps.onChange}
            disabled={switchProps.disabled}
            aria-label={switchProps.ariaLabel || `Enable ${title}`}
          />
        ) : (
          <span className="admin-feature-row__switch-spacer" aria-hidden />
        )}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="admin-feature-row__open"
        aria-label={`Open ${title}`}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
