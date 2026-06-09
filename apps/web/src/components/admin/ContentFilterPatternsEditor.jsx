import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import {
  adminBtnSecondary,
  adminControl,
  adminTableWrap,
} from '@/components/admin/adminUi'
import {
  DEFAULT_BLOCKED_TEXTS,
  createEmptyBlockedTextRule,
  ruleHasValidationError,
  slugFromLabel,
} from '@/services/contentFilterRules'

/**
 * @param {{
 *   patterns?: import('@/services/contentFilterRules').BlockedTextRule[],
 *   onChange: (next: import('@/services/contentFilterRules').BlockedTextRule[]) => void,
 *   readOnly?: boolean,
 * }} props
 */
export default function ContentFilterPatternsEditor({
  patterns = [],
  onChange,
  readOnly = false,
}) {
  function updateText(index, text) {
    onChange(
      patterns.map((row, i) => {
        if (i !== index) return row
        const trimmed = text
        const label = row.label?.trim() || trimmed.trim()
        return {
          ...row,
          text: trimmed,
          label: label || trimmed,
          id: row.id?.trim() || slugFromLabel(trimmed, row.id),
        }
      }),
    )
  }

  function removeAt(index) {
    onChange(patterns.filter((_, i) => i !== index))
  }

  function addRule() {
    onChange([...patterns, createEmptyBlockedTextRule(patterns)])
  }

  function resetToDefaults() {
    onChange(DEFAULT_BLOCKED_TEXTS.map((row) => ({ ...row })))
  }

  const invalidCount = patterns.filter((row) => ruleHasValidationError(row)).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-400">
          If a message <span className="text-zinc-200">contains</span> any entry below — word,
          abbreviation, phrase, or link — the filter runs.
        </p>
        {!readOnly ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={resetToDefaults}
              className={`inline-flex items-center gap-1.5 ${adminBtnSecondary}`}
            >
              <RotateCcw className="size-3.5" />
              Reset defaults
            </button>
            <button
              type="button"
              onClick={addRule}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-violet-500/15 px-2.5 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/25"
            >
              <Plus className="size-3.5" />
              Add entry
            </button>
          </div>
        ) : null}
      </div>

      <div className={adminTableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="w-10 px-3 py-2.5 text-center font-medium text-zinc-400">#</th>
                <th className="min-w-[16rem] px-3 py-2.5 text-left font-medium text-zinc-400">
                  If message contains…
                </th>
                <th className="w-12 px-3 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {patterns.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-sm text-zinc-500">
                    No blocked text yet. Add an entry or restore the recommended defaults.
                  </td>
                </tr>
              ) : (
                patterns.map((row, index) => {
                  const hasError = ruleHasValidationError(row)
                  return (
                    <tr key={`${row.id}-${index}`} className="group">
                      <td className="px-3 py-2 text-center text-xs tabular-nums text-zinc-600">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="text"
                          value={row.text ?? ''}
                          onChange={(e) => updateText(index, e.target.value)}
                          placeholder="e.g. badword, child porn, https://example.com/bad"
                          disabled={readOnly}
                          spellCheck={false}
                          className={`${adminControl} h-10 px-3 ${
                            hasError ? 'ring-1 ring-red-500/50' : ''
                          }`}
                          aria-label={`Blocked text ${index + 1}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center align-middle">
                        {!readOnly ? (
                          <button
                            type="button"
                            onClick={() => removeAt(index)}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-500/15 hover:text-red-400"
                            aria-label={`Remove entry ${index + 1}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        {patterns.length} entr{patterns.length === 1 ? 'y' : 'ies'}
        {invalidCount > 0 ? (
          <span className="text-red-300">
            {' '}
            · {invalidCount} empty entr{invalidCount === 1 ? 'y' : 'ies'} will be ignored on save
          </span>
        ) : null}
      </p>
    </div>
  )
}
