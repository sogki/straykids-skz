import AdminSwitch from '@/components/admin/AdminSwitch'
import { adminSettingsRow } from '@/components/admin/adminUi'

/**
 * Title and enable/disable switch on one row — use for feature toggles in admin panels.
 */
export default function AdminSettingsRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
  className = '',
}) {
  return (
    <div className={[adminSettingsRow, className].filter(Boolean).join(' ')}>
      <div className="admin-settings-row__text">
        <span className="admin-settings-row__title">{title}</span>
        {description ? <p className="admin-settings-row__desc">{description}</p> : null}
      </div>
      <AdminSwitch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={title}
      />
    </div>
  )
}
