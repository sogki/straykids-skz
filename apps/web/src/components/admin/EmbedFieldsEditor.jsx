import { Plus, Trash2 } from 'lucide-react'
import AdminSwitch from '@/components/admin/AdminSwitch'

const inputClass =
  'w-full rounded-lg border border-zinc-700/80 bg-[#0d0d11] px-2 py-1.5 text-sm text-zinc-100 outline-none transition focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/20'

export default function EmbedFieldsEditor({
  fields = [],
  onAdd,
  onUpdate,
  onRemove,
  emptyHint = 'No fields yet.',
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          {fields.length} row{fields.length === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-violet-500/15 px-2 py-1 text-xs font-medium text-violet-200 hover:bg-violet-500/25"
        >
          <Plus className="size-3.5" />
          Add field
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800/90 bg-[#111116]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#1a1a21] text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="w-8 px-2 py-2 text-center font-medium">#</th>
                <th className="min-w-[7rem] px-2 py-2 text-left font-medium">Name</th>
                <th className="min-w-[12rem] px-2 py-2 text-left font-medium">Value</th>
                <th className="w-14 px-2 py-2 text-center font-medium">Inline</th>
                <th className="w-10 px-2 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 bg-[#121218]">
              {fields.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-5 text-center text-xs text-zinc-500">
                    {emptyHint}
                  </td>
                </tr>
              ) : (
                fields.map((field, index) => (
                  <tr key={index} className="group">
                    <td className="px-2 py-1.5 text-center text-xs tabular-nums text-zinc-600">
                      {index + 1}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <input
                        type="text"
                        className={inputClass}
                        value={field.name ?? ''}
                        onChange={(e) => onUpdate(index, 'name', e.target.value)}
                        placeholder="Field name"
                        aria-label={`Field ${index + 1} name`}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <textarea
                        rows={2}
                        className={`${inputClass} min-h-[2.5rem] resize-y`}
                        value={field.value ?? ''}
                        onChange={(e) => onUpdate(index, 'value', e.target.value)}
                        placeholder="{placeholder}"
                        aria-label={`Field ${index + 1} value`}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <div className="flex justify-center">
                        <AdminSwitch
                          size="sm"
                          checked={!!field.inline}
                          onChange={(v) => onUpdate(index, 'inline', v)}
                          aria-label={`Field ${index + 1} inline`}
                          title="Inline (up to 3 per row)"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-500/15 hover:text-red-400"
                        aria-label={`Remove field ${index + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {fields.length > 0 ? (
        <p className="text-[11px] text-zinc-600">
          Inline fields sit side-by-side in Discord (max 3 per row). Full-width rows use inline off.
        </p>
      ) : null}
    </div>
  )
}
