import { ChevronDown } from 'lucide-react'
import { adminSelect, adminSelectWrap } from '@/components/admin/adminUi'

/**
 * Styled native select matching admin panel controls (dark field + chevron).
 */
export default function AdminSelect({
  id,
  value,
  onChange,
  disabled = false,
  className = '',
  wrapperClassName = '',
  size = 'md',
  'aria-label': ariaLabel,
  children,
  ...rest
}) {
  const sizeClass = size === 'sm' ? 'admin-select--sm' : ''

  return (
    <div
      className={[adminSelectWrap, wrapperClassName].filter(Boolean).join(' ')}
    >
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        className={[adminSelect, sizeClass, className].filter(Boolean).join(' ')}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="admin-select__chevron" aria-hidden />
    </div>
  )
}
