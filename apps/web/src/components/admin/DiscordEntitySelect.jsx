import AdminSelect from '@/components/admin/AdminSelect'
import { adminField, adminFieldHint, adminFieldLabel } from '@/components/admin/adminUi'

/**
 * Dropdown populated from the bot's synced Discord channel/role cache.
 */
export default function DiscordEntitySelect({
  label,
  hint,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  allowEmpty = true,
  compact = false,
}) {
  return (
    <label className={compact ? 'block' : adminField}>
      {label && (
        <span className={compact ? 'sr-only' : adminFieldLabel}>{label}</span>
      )}
      <AdminSelect
        size={compact ? 'sm' : 'md'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={compact ? label || placeholder : undefined}
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.entity_id} value={opt.entity_id}>
            {opt.name}
            {opt.extra?.kind === 'voice' ? ' (voice)' : ''}
          </option>
        ))}
      </AdminSelect>
      {hint && <span className={adminFieldHint}>{hint}</span>}
      {!options.length && (
        <span className="block text-xs text-amber-400/90">
          No options cached yet — save guild ID, run the bot, then click Sync Discord
          or run /reload in Discord.
        </span>
      )}
    </label>
  )
}
