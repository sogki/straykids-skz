import { Check } from 'lucide-react'
import { adminCheckbox } from '@/components/admin/adminUi'

/**
 * Custom checkbox aligned with admin panel styling (not the pill AdminSwitch).
 */
export default function AdminCheckbox({
  checked,
  onChange,
  disabled = false,
  id,
  name,
  className = '',
  children,
  'aria-label': ariaLabel,
}) {
  return (
    <label
      className={[adminCheckbox, disabled ? 'admin-checkbox--disabled' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        className="admin-checkbox__input"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="admin-checkbox__box" aria-hidden>
        {checked ? <Check className="admin-checkbox__icon" strokeWidth={3} /> : null}
      </span>
      {children ? <span className="admin-checkbox__label">{children}</span> : null}
    </label>
  )
}
