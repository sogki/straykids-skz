import CollapsibleSection from '@/components/admin/CollapsibleSection'
import { adminSubsection } from '@/components/admin/adminUi'

/**
 * Standalone security settings card (always expanded on its own page).
 */
export default function SecuritySubCard({
  title,
  description,
  switch: headerSwitch,
  children,
}) {
  if (headerSwitch) {
    return (
      <CollapsibleSection
        title={title}
        subtitle={description}
        defaultOpen
        open
        switch={headerSwitch}
      >
        <div className="space-y-4">{children}</div>
      </CollapsibleSection>
    )
  }

  return (
    <section className={adminSubsection}>
      {(title || description) && (
        <div className="mb-4">
          {title ? <h4 className="text-base font-semibold text-zinc-100">{title}</h4> : null}
          {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  )
}
