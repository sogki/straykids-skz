import AdminSelect from '@/components/admin/AdminSelect'
import SubCard from '@/components/admin/SecuritySubCard'
import { adminControl } from '@/components/admin/adminUi'

/**
 * @param {{
 *   draft: Record<string, string>,
 *   setDraft: (fn: (prev: Record<string, string>) => Record<string, string>) => void,
 *   readOnly?: boolean,
 * }} props
 */
export default function SecurityAccountAgePanel({ draft, setDraft, readOnly = false }) {
  return (
    <SubCard
      title="Account age gate"
      description="Reject Discord accounts younger than the minimum age when they join or try to verify."
      switch={{
        checked: draft.account_age_gate_enabled === 'true',
        onChange: (next) =>
          setDraft((p) => ({ ...p, account_age_gate_enabled: next ? 'true' : 'false' })),
        ariaLabel: 'Enable account age gate',
        disabled: readOnly,
      }}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Minimum account age (hours)</span>
          <input
            type="number"
            min={1}
            max={8760}
            value={draft.account_age_min_hours || '24'}
            onChange={(e) => setDraft((p) => ({ ...p, account_age_min_hours: e.target.value }))}
            disabled={readOnly}
            className={`mt-1.5 ${adminControl}`}
          />
          <p className="mt-1 text-xs text-zinc-500">Default is 24 hours (1 day).</p>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Action for young accounts</span>
          <AdminSelect
            value={draft.account_age_action || 'kick'}
            onChange={(e) => setDraft((p) => ({ ...p, account_age_action: e.target.value }))}
            disabled={readOnly}
            className="mt-1.5"
          >
            <option value="kick">Kick from server</option>
            <option value="ban">Ban from server</option>
          </AdminSelect>
        </label>
      </div>
      <p className="text-xs text-zinc-500">
        Staff with moderator or full-admin access bypass this gate. Kicks and bans are logged under{' '}
        <span className="text-zinc-400">Server security → Security logging</span>.
      </p>
    </SubCard>
  )
}
