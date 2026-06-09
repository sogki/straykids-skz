import AdminSelect from '@/components/admin/AdminSelect'
import ContentFilterPatternsEditor from '@/components/admin/ContentFilterPatternsEditor'
import SubCard from '@/components/admin/SecuritySubCard'

/**
 * @param {{
 *   draft: Record<string, string>,
 *   setDraft: (fn: (prev: Record<string, string>) => Record<string, string>) => void,
 *   patterns: import('@/services/contentFilterRules').BlockedTextRule[],
 *   onPatternsChange: (next: import('@/services/contentFilterRules').BlockedTextRule[]) => void,
 *   readOnly?: boolean,
 * }} props
 */
export default function SecurityPatternsPanel({
  draft,
  setDraft,
  patterns,
  onPatternsChange,
  readOnly = false,
}) {
  return (
    <>
      <SubCard
        title="Content filter"
        description="When enabled, any message containing a blocked word, phrase, abbreviation, or link triggers action."
        switch={{
          checked: draft.content_filter_enabled === 'true',
          onChange: (next) =>
            setDraft((p) => ({ ...p, content_filter_enabled: next ? 'true' : 'false' })),
          ariaLabel: 'Enable prohibited content filter',
          disabled: readOnly,
        }}
      >
        <label className="block max-w-md">
          <span className="text-xs font-medium text-zinc-400">Action after match</span>
          <AdminSelect
            value={draft.content_filter_action || 'ban'}
            onChange={(e) => setDraft((p) => ({ ...p, content_filter_action: e.target.value }))}
            disabled={readOnly}
            className="mt-1.5"
          >
            <option value="ban">Delete message and ban member</option>
            <option value="kick">Delete message and kick member</option>
          </AdminSelect>
        </label>
      </SubCard>

      <SubCard title="Blocked text" description="One entry per line in the table — matching is case-insensitive.">
        <ContentFilterPatternsEditor
          patterns={patterns}
          onChange={onPatternsChange}
          readOnly={readOnly}
        />
      </SubCard>
    </>
  )
}
