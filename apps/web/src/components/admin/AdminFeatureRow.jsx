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
        <div className="admin-feature-card__top">
          <button type="button" onClick={onOpen} className="admin-feature-card__icon-btn">
            {Icon ? (
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
            ) : null}
          </button>
          <div className="admin-feature-card__actions">
            {hasSwitch ? (
              <AdminSwitch
                checked={switchProps.checked}
                onChange={switchProps.onChange}
                disabled={switchProps.disabled}
                aria-label={switchProps.ariaLabel || `Enable ${title}`}
              />
            ) : null}
            <button
              type="button"
              onClick={onOpen}
              className="admin-feature-card__open"
              aria-label={`Open ${title}`}
            >
              <ChevronRight className="admin-feature-card__chevron" aria-hidden />
            </button>
          </div>
        </div>
        <button type="button" onClick={onOpen} className="admin-feature-card__main">
          <span className="admin-feature-card__title">{title}</span>
          {description ? (
            <span className="admin-feature-card__desc">{description}</span>
          ) : null}
          {meta ? <span className="admin-feature-card__meta">{meta}</span> : null}
        </button>
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
