import { Hash, X } from 'lucide-react'
import AdminSelect from '@/components/admin/AdminSelect'
import { adminField, adminFieldHint, adminFieldLabel } from '@/components/admin/adminUi'

/**
 * Pick multiple Discord text channels from the synced cache.
 *
 * @param {{
 *   label?: string,
 *   hint?: string,
 *   valueIds?: string[],
 *   onChange: (ids: string[]) => void,
 *   options?: Array<{ entity_id: string, name: string }>,
 *   readOnly?: boolean,
 * }} props
 */
export default function DiscordChannelMultiSelect({
  label,
  hint,
  valueIds = [],
  onChange,
  options = [],
  readOnly = false,
}) {
  const selected = new Set(valueIds)
  const available = options.filter((opt) => !selected.has(opt.entity_id))

  function removeId(id) {
    onChange(valueIds.filter((value) => value !== id))
  }

  function addId(id) {
    if (!id || selected.has(id)) return
    onChange([...valueIds, id])
  }

  return (
    <div className={adminField}>
      {label ? <span className={adminFieldLabel}>{label}</span> : null}

      {valueIds.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-2">
          {valueIds.map((id) => {
            const channel = options.find((opt) => opt.entity_id === id)
            return (
              <li
                key={id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/90 px-2.5 py-1.5 text-sm text-zinc-200 ring-1 ring-white/10"
              >
                <Hash className="size-3.5 shrink-0 text-zinc-500" aria-hidden />
                <span>{channel?.name ?? 'Unknown channel'}</span>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => removeId(id)}
                    className="inline-flex size-6 items-center justify-center rounded-md text-zinc-500 transition hover:bg-red-500/15 hover:text-red-300"
                    aria-label={`Remove ${channel?.name ?? id}`}
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mb-3 rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-sm text-zinc-500">
          No exempt channels selected.
        </p>
      )}

      {!readOnly ? (
        <AdminSelect
          value=""
          onChange={(e) => addId(e.target.value)}
          disabled={!available.length}
          aria-label={label ? `Add ${label}` : 'Add exempt channel'}
        >
          <option value="">
            {available.length ? 'Add a channel…' : 'All channels already selected'}
          </option>
          {available.map((opt) => (
            <option key={opt.entity_id} value={opt.entity_id}>
              {opt.name}
            </option>
          ))}
        </AdminSelect>
      ) : null}

      {hint ? <span className={adminFieldHint}>{hint}</span> : null}

      {!options.length ? (
        <span className="block text-xs text-amber-400/90">
          No channels cached yet — save guild ID, run the bot, then Sync Discord or /reload.
        </span>
      ) : null}
    </div>
  )
}
