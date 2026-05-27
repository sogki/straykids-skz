import { BANNER_ICON_OPTIONS } from '@/data/bannerIcons'
import BannerIcon from '@/components/banner/BannerIcon'
import { cn } from '@/lib/utils'

export default function BannerIconPicker({ value, onChange }) {
  return (
    <div className="admin-icon-picker" role="listbox" aria-label="Banner icon">
      {BANNER_ICON_OPTIONS.map((opt) => {
        const selected = value === opt.name
        return (
          <button
            key={opt.name || 'none'}
            type="button"
            role="option"
            aria-selected={selected}
            className={cn(
              'admin-icon-picker__btn',
              selected && 'admin-icon-picker__btn--active'
            )}
            title={opt.label}
            onClick={() => onChange(opt.name)}
          >
            {opt.name ? (
              <BannerIcon name={opt.name} size={18} />
            ) : (
              <span className="admin-icon-picker__none">—</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
