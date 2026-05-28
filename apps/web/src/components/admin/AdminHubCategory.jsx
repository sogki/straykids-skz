import { Children } from 'react'
import { adminHubCategories, adminHubCategory, adminHubGrid } from '@/components/admin/adminUi'

/**
 * Grouped hub section with a responsive grid of feature rows (or other cards).
 * Omits the block when every child is hidden (false/null).
 */
export default function AdminHubCategory({ title, description, children }) {
  const items = Children.toArray(children).filter(Boolean)
  if (!items.length) return null

  return (
    <section className={adminHubCategory}>
      <header className="admin-hub-category__head">
        <h4 className="admin-hub-category__title">{title}</h4>
        {description ? (
          <p className="admin-hub-category__desc">{description}</p>
        ) : null}
      </header>
      <div className={adminHubGrid}>{items}</div>
    </section>
  )
}

export function AdminHubCategories({ children }) {
  const sections = Children.toArray(children).filter(Boolean)
  if (!sections.length) return null

  return <div className={adminHubCategories}>{sections}</div>
}
