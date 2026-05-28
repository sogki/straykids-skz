import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Hash,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Volume2,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createReactionRole,
  deleteReactionRole,
  fetchBotConfig,
  REACTION_ROLE_CATEGORIES,
  saveBotSettings,
  updateReactionRole,
} from '@/services/skzAdminBot'
import { getStoredAdminCode } from '@/services/skzAdmin'

const MIGRATION_HINT =
  'Run migrations 20260528000001_skz_bot_schema.sql and 20260528000002_skz_bot_admin_rpcs.sql in Supabase, then click Refresh.'

function isMigrationError(message) {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes('skz_admin_bot_') ||
    m.includes('skz_bot_') ||
    m.includes('function') && m.includes('does not exist')
  )
}

const EMPTY_FORM = {
  category: 'general',
  label: '',
  channel_id: '',
  message_id: '',
  emoji: '',
  role_id: '',
  remove_on_unreact: true,
  is_active: true,
}

export default function BotAdmin() {
  const code = getStoredAdminCode()
  const [config, setConfig] = useState({ settings: null, reactionRoles: [] })
  const [draft, setDraft] = useState(null) // editable copy of settings
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [busyRoleId, setBusyRoleId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [editing, setEditing] = useState(null) // role id being edited, or 'new'
  const [form, setForm] = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setShowHint(false)
    try {
      const data = await fetchBotConfig(code)
      setConfig(data)
      setDraft(data.settings)
    } catch (err) {
      const msg = err.message || 'Could not load bot config'
      setError(msg)
      setShowHint(isMigrationError(msg))
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    load()
  }, [load])

  const isDirty = useMemo(() => {
    if (!draft || !config.settings) return false
    return Object.keys(draft).some((key) => draft[key] !== config.settings[key])
  }, [draft, config.settings])

  function setField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    setError('')
    setMessage('')
    try {
      const next = await saveBotSettings(code, draft)
      setConfig(next)
      setDraft(next.settings)
      setMessage('Bot settings saved. Run /reload in Discord to apply them now (or restart the bot).')
    } catch (err) {
      const msg = err.message || 'Save failed'
      setError(msg)
      setShowHint(isMigrationError(msg))
    } finally {
      setSavingSettings(false)
    }
  }

  function startCreate() {
    setEditing('new')
    setForm({ ...EMPTY_FORM })
    setMessage('')
    setError('')
  }

  function startEdit(role) {
    setEditing(role.id)
    setForm({
      category: role.category,
      label: role.label || '',
      channel_id: role.channel_id,
      message_id: role.message_id,
      emoji: role.emoji,
      role_id: role.role_id,
      remove_on_unreact: role.remove_on_unreact,
      is_active: role.is_active,
    })
    setMessage('')
    setError('')
  }

  function cancelEdit() {
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmitRole() {
    setBusyRoleId(editing || '__new__')
    setError('')
    setMessage('')
    try {
      const data =
        editing === 'new'
          ? await createReactionRole(code, form)
          : await updateReactionRole(code, editing, form)
      setConfig(data)
      setEditing(null)
      setForm(EMPTY_FORM)
      setMessage(
        editing === 'new'
          ? 'Reaction role created. Run /reload in Discord to apply it now.'
          : 'Reaction role updated. Run /reload in Discord to apply it now.',
      )
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setBusyRoleId(null)
    }
  }

  async function handleToggleActive(role) {
    setBusyRoleId(role.id)
    setError('')
    setMessage('')
    try {
      const data = await updateReactionRole(code, role.id, {
        is_active: !role.is_active,
      })
      setConfig(data)
    } catch (err) {
      setError(err.message || 'Toggle failed')
    } finally {
      setBusyRoleId(null)
    }
  }

  async function handleDeleteRole(role) {
    const confirmed = window.confirm(
      `Delete this reaction role?\n\n${role.label || role.category} · ${role.emoji} → role ${role.role_id}\n\nThis cannot be undone.`,
    )
    if (!confirmed) return
    setBusyRoleId(role.id)
    setError('')
    setMessage('')
    try {
      const data = await deleteReactionRole(code, role.id)
      setConfig(data)
      setMessage('Reaction role deleted.')
    } catch (err) {
      setError(err.message || 'Delete failed')
    } finally {
      setBusyRoleId(null)
    }
  }

  const groupedRoles = useMemo(() => {
    const groups = new Map()
    for (const cat of REACTION_ROLE_CATEGORIES) {
      groups.set(cat.value, [])
    }
    for (const r of config.reactionRoles) {
      const key = groups.has(r.category) ? r.category : 'other'
      groups.get(key).push(r)
    }
    return [...groups.entries()].filter(([, rows]) => rows.length > 0)
  }, [config.reactionRoles])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" />
        Loading bot config…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Discord bot</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Settings the bot reads from the database. After changing anything
            here, run <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">/reload</code> in
            Discord (or restart the bot) to pick up the changes.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
          onClick={load}
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      {message && (
        <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {showHint && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <span className="font-semibold">Database migration required: </span>
          {MIGRATION_HINT}
        </p>
      )}

      {/* ── Server settings ── */}
      <Card className="border-white/10 bg-[#111113]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="size-4 text-violet-400" />
            Server
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Guild ID"
            hint="The Stray Kids Discord server's ID. Right-click the server in Discord with Developer Mode on → Copy Server ID."
            value={draft?.guild_id || ''}
            onChange={(v) => setField('guild_id', v)}
            placeholder="123456789012345678"
          />
        </CardContent>
      </Card>

      {/* ── Verify on react ── */}
      <Card className="border-white/10 bg-[#111113]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-emerald-400" />
            Verify on react
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-500">
            When a user reacts to the verify message with the configured emoji,
            the bot grants them the verify role. The verify role is sticky — un-reacting does not remove it.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Verify channel ID"
              value={draft?.verify_channel_id || ''}
              onChange={(v) => setField('verify_channel_id', v)}
              placeholder="Channel containing the verify message"
            />
            <Field
              label="Verify message ID"
              value={draft?.verify_message_id || ''}
              onChange={(v) => setField('verify_message_id', v)}
              placeholder="The specific message users react to"
            />
            <Field
              label="Verify emoji"
              hint='Unicode like "✅" or custom like "<:name:12345>".'
              value={draft?.verify_emoji || ''}
              onChange={(v) => setField('verify_emoji', v)}
              placeholder="✅"
            />
            <Field
              label="Verify role ID"
              value={draft?.verify_role_id || ''}
              onChange={(v) => setField('verify_role_id', v)}
              placeholder="Role granted on verify"
            />
          </div>
          <p className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">Note:</span> the
            verify message must also be registered as a reaction-role below
            (with category <code className="rounded bg-zinc-800 px-1">verify</code>) for the bot to react to it. The fields above are just here for documentation/admin overview.
          </p>
        </CardContent>
      </Card>

      {/* ── Join-to-create voice ── */}
      <Card className="border-white/10 bg-[#111113]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="size-4 text-sky-400" />
            Join to create
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-500">
            Join the hub voice channel and the bot will create a personal VC
            for you, named per the pattern below. The channel auto-deletes
            when everyone leaves.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Hub voice channel ID"
              hint="Users who join this VC get a personal one made for them."
              value={draft?.join_to_create_channel_id || ''}
              onChange={(v) => setField('join_to_create_channel_id', v)}
            />
            <Field
              label="Category ID (optional)"
              hint="Where to put the new VCs. Leave blank to use the hub's category."
              value={draft?.join_to_create_category_id || ''}
              onChange={(v) => setField('join_to_create_category_id', v)}
            />
            <Field
              label="Name pattern"
              hint="{username} = Discord login; {displayname} = server nickname."
              value={draft?.join_to_create_name_pattern || ''}
              onChange={(v) => setField('join_to_create_name_pattern', v)}
              placeholder="{username}'s vc"
              span={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setDraft(config.settings)}
          disabled={!isDirty || savingSettings}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-40"
        >
          Reset changes
        </button>
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={!isDirty || savingSettings}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:opacity-40"
        >
          {savingSettings ? <Loader2 className="size-4 animate-spin" /> : null}
          Save settings
        </button>
      </div>

      {/* ── Reaction roles ── */}
      <Card className="border-white/10 bg-[#111113]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
          <CardTitle className="text-base">Reaction roles</CardTitle>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
          >
            <Plus className="size-4" />
            Add reaction role
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing && (
            <ReactionRoleForm
              form={form}
              setForm={setForm}
              onCancel={cancelEdit}
              onSubmit={handleSubmitRole}
              busy={!!busyRoleId}
              isNew={editing === 'new'}
            />
          )}

          {config.reactionRoles.length === 0 && !editing && (
            <p className="rounded-lg border border-dashed border-zinc-700/80 py-10 text-center text-sm text-zinc-500">
              No reaction roles yet. Click "Add reaction role" to create one.
            </p>
          )}

          {groupedRoles.map(([categoryValue, rows]) => {
            const meta =
              REACTION_ROLE_CATEGORIES.find((c) => c.value === categoryValue) ||
              { label: categoryValue }
            return (
              <div key={categoryValue} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {meta.label}
                </h3>
                <ul className="space-y-2">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-xl">
                        <span>{row.emoji}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">
                            {row.label || '(no label)'}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              row.is_active
                                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                                : 'border-zinc-600/40 bg-zinc-700/15 text-zinc-400'
                            }`}
                          >
                            {row.is_active ? 'Active' : 'Disabled'}
                          </span>
                          {row.remove_on_unreact ? null : (
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                              Sticky
                            </span>
                          )}
                        </div>
                        <p className="mt-1 break-all text-xs text-zinc-500">
                          msg <code className="text-zinc-300">{row.message_id}</code>{' '}
                          in channel <code className="text-zinc-300">{row.channel_id}</code>
                          {' → '}role <code className="text-zinc-300">{row.role_id}</code>
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(row)}
                          disabled={busyRoleId === row.id}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-40"
                          title={row.is_active ? 'Disable' : 'Enable'}
                        >
                          {row.is_active ? (
                            <CheckCircle2 className="size-4 text-emerald-400" />
                          ) : (
                            <XCircle className="size-4 text-zinc-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          disabled={busyRoleId === row.id}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-40"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(row)}
                          disabled={busyRoleId === row.id}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, hint, value, onChange, placeholder, span = 1 }) {
  return (
    <label className={`block space-y-1 ${span === 2 ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      <input
        type="text"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-violet-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
    </label>
  )
}

function ReactionRoleForm({ form, setForm, onCancel, onSubmit, busy, isNew }) {
  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  const canSubmit =
    form.channel_id.trim() &&
    form.message_id.trim() &&
    form.emoji.trim() &&
    form.role_id.trim()

  return (
    <div className="space-y-4 rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-violet-200">
          {isNew ? 'New reaction role' : 'Edit reaction role'}
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Category
          </span>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          >
            {REACTION_ROLE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Label (admin only)"
          value={form.label}
          onChange={(v) => update('label', v)}
          placeholder='e.g. "He/Him"'
        />
        <Field
          label="Channel ID"
          value={form.channel_id}
          onChange={(v) => update('channel_id', v)}
        />
        <Field
          label="Message ID"
          value={form.message_id}
          onChange={(v) => update('message_id', v)}
        />
        <Field
          label="Emoji"
          hint='Unicode like "✅" or custom like "<:name:12345>".'
          value={form.emoji}
          onChange={(v) => update('emoji', v)}
        />
        <Field
          label="Role ID"
          value={form.role_id}
          onChange={(v) => update('role_id', v)}
        />
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.remove_on_unreact}
            onChange={(e) => update('remove_on_unreact', e.target.checked)}
            className="size-4 rounded border-zinc-600 bg-zinc-900"
          />
          <span className="text-sm text-zinc-300">
            Remove role when user removes their reaction
          </span>
          <span className="text-xs text-zinc-500">
            (uncheck for verify-style sticky roles)
          </span>
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-500 px-3 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {isNew ? 'Create' : 'Save'}
        </button>
      </div>
    </div>
  )
}
