import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import CollapsibleSection from '@/components/admin/CollapsibleSection'
import DiscordButtonChip from '@/components/admin/DiscordButtonChip'
import DiscordEntitySelect from '@/components/admin/DiscordEntitySelect'
import DiscordMessagePreview from '@/components/admin/DiscordMessagePreview'
import EmbedColorPicker from '@/components/admin/EmbedColorPicker'
import EmbedFieldsEditor from '@/components/admin/EmbedFieldsEditor'
import EmojiPickerField from '@/components/admin/EmojiPickerField'
import PanelTemplatePicker from '@/components/admin/PanelTemplatePicker'
import {
  channelsFromCache,
  EMPTY_EMBED,
  hexColorToInt,
  rolesFromCache,
} from '@/services/skzAdminBot'
import {
  EMBED_PLACEHOLDERS,
  PREVIEW_PLACEHOLDER_CONTEXT,
  resolveEmbedPlaceholders,
  resolvePlaceholders,
} from '@skz/shared'
import { DISCORD_MESSAGE_PREVIEW_WIDTH } from '@/components/admin/discordPreviewConstants'
import {
  adminAddDashed,
  adminControl,
  adminControlTextarea,
  adminDividerSection,
  adminInset,
  adminPreviewPanel,
  adminToolbarSticky,
} from '@/components/admin/adminUi'

const MAX_ROLES = 20

const VERIFY_DEFAULTS = {
  category: 'verify',
  label: 'Verify',
  emoji: '✅',
  button_emoji: '',
  role_id: '',
  button_style: 'success',
  remove_on_unreact: false,
}

const EMPTY_ROLE = {
  category: 'general',
  label: 'Your button',
  emoji: '🙂',
  button_emoji: '',
  role_id: '',
  button_style: 'primary',
  remove_on_unreact: true,
}

const BUTTON_COLORS = [
  { value: 'primary', ring: 'ring-[#5865f2]', bg: 'bg-[#5865f2]' },
  { value: 'success', ring: 'ring-[#248046]', bg: 'bg-[#248046]' },
  { value: 'danger', ring: 'ring-[#da373c]', bg: 'bg-[#da373c]' },
  { value: 'secondary', ring: 'ring-[#4e5058]', bg: 'bg-[#4e5058]' },
]

let localIdCounter = 0
function nextLocalId() {
  localIdCounter += 1
  return `local-${localIdCounter}`
}

const DEFAULT_FEEDBACK = {
  verify: {
    added: "Welcome to **{server}**, {username}! You're now verified.",
    removed: '',
    already: "You're already verified.",
    error: 'Could not verify you. Ask a mod to check my permissions and role hierarchy.',
  },
  roles: {
    added: 'Added **{role}**.',
    removed: 'Removed **{role}**.',
    already: 'You already have **{role}**.',
    error: 'Could not update your role. Check bot permissions and role hierarchy.',
  },
}

function defaultFeedback(kind) {
  return kind === 'verify' ? DEFAULT_FEEDBACK.verify : DEFAULT_FEEDBACK.roles
}

function panelFromMessage(message) {
  if (!message) {
    return {
      id: null,
      slug: '',
      label: '',
      kind: 'reaction_roles',
      channel_id: '',
      interaction_mode: 'reaction',
      is_active: true,
      allow_multiple_roles: true,
      feedback: { ...DEFAULT_FEEDBACK.roles },
      embed: { ...EMPTY_EMBED, fields: [] },
    }
  }
  const opts = message.embed?.panel_options || {}
  const fb = opts.feedback || {}
  const defaults = defaultFeedback(message.kind ?? 'reaction_roles')
  return {
    id: message.id ?? null,
    slug: message.slug ?? '',
    label: message.label ?? '',
    kind: message.kind ?? 'reaction_roles',
    channel_id: message.channel_id ?? '',
    interaction_mode: message.interaction_mode ?? 'reaction',
    is_active: message.is_active !== false,
    allow_multiple_roles: opts.allow_multiple !== false,
    feedback: {
      added: fb.added ?? defaults.added,
      removed: fb.removed ?? defaults.removed,
      already: fb.already ?? defaults.already,
      error: fb.error ?? defaults.error,
    },
    embed: {
      ...EMPTY_EMBED,
      ...(message.embed || {}),
      author: { ...EMPTY_EMBED.author, ...(message.embed?.author || {}) },
      thumbnail: { ...EMPTY_EMBED.thumbnail, ...(message.embed?.thumbnail || {}) },
      image: { ...EMPTY_EMBED.image, ...(message.embed?.image || {}) },
      footer: { ...EMPTY_EMBED.footer, ...(message.embed?.footer || {}) },
      fields: Array.isArray(message.embed?.fields) ? [...message.embed.fields] : [],
    },
  }
}

function rolesToDraft(linkedRoles) {
  return linkedRoles
    .filter((r) => r.is_active !== false)
    .map((r) => ({
      localId: r.id || nextLocalId(),
      id: r.id ?? null,
      category: r.category,
      label: r.label || 'Your button',
      emoji: r.emoji || '🙂',
      button_emoji: r.button_emoji || '',
      role_id: r.role_id || '',
      button_style: r.button_style || 'primary',
      remove_on_unreact: r.remove_on_unreact !== false,
    }))
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function BotMessageEditor({
  message,
  initialTemplate = null,
  discordCache,
  onPublish,
  onSave,
  onDiscard,
  onDeleteMessage,
  busy,
  linkedRoles,
}) {
  const [templateChosen, setTemplateChosen] = useState(
    Boolean(message?.id || initialTemplate),
  )
  const [draft, setDraft] = useState(() => panelFromMessage(message))
  const [draftRoles, setDraftRoles] = useState(() => rolesToDraft(linkedRoles))
  const [editingLocalId, setEditingLocalId] = useState(null)
  const [showAdvancedEmbed, setShowAdvancedEmbed] = useState(false)

  function applyTemplate(template) {
    setDraft({
      ...panelFromMessage(null),
      kind: template.kind,
      slug: template.slug,
      label: template.label,
      interaction_mode: template.interaction_mode,
      feedback:
        template.kind === 'verify'
          ? { ...DEFAULT_FEEDBACK.verify }
          : { ...DEFAULT_FEEDBACK.roles },
      embed: {
        ...EMPTY_EMBED,
        fields: [],
        title: template.embed.title ?? 'React to this message to get your roles!',
        description: template.embed.description ?? '',
        color: template.embed.color ?? EMPTY_EMBED.color,
      },
    })
    if (template.kind === 'verify') {
      const entry = { localId: nextLocalId(), id: null, ...VERIFY_DEFAULTS }
      setDraftRoles([entry])
      setEditingLocalId(entry.localId)
    } else {
      setDraftRoles([])
    }
    setTemplateChosen(true)
  }

  useEffect(() => {
    setDraft(panelFromMessage(message))
    setDraftRoles(rolesToDraft(linkedRoles))
    setEditingLocalId(null)
    setShowAdvancedEmbed(false)
    if (message?.id) setTemplateChosen(true)
    else if (initialTemplate) applyTemplate(initialTemplate)
    else setTemplateChosen(false)
  }, [message?.id, message?.slug, initialTemplate?.id])

  const isVerify = draft.kind === 'verify'
  const isGeneral = draft.kind === 'general'
  const needsRoles = !isGeneral
  const panelId = draft.id ?? message?.id ?? null
  const useButtons = draft.interaction_mode === 'button'
  const useEmoji = draft.interaction_mode === 'reaction'

  const textChannels = useMemo(
    () => channelsFromCache(discordCache, 'text'),
    [discordCache],
  )
  const roleOptions = useMemo(() => rolesFromCache(discordCache), [discordCache])

  const previewEmbed = useMemo(
    () => resolveEmbedPlaceholders(draft.embed, PREVIEW_PLACEHOLDER_CONTEXT),
    [draft.embed],
  )

  const previewRoles = useMemo(
    () =>
      draftRoles.map((r) => ({
        ...r,
        label: resolvePlaceholders(r.label, PREVIEW_PLACEHOLDER_CONTEXT),
      })),
    [draftRoles],
  )

  function setEmbed(key, value) {
    setDraft((d) => ({ ...d, embed: { ...d.embed, [key]: value } }))
  }

  function setEmbedNested(section, key, value) {
    setDraft((d) => ({
      ...d,
      embed: {
        ...d.embed,
        [section]: { ...(d.embed[section] || {}), [key]: value },
      },
    }))
  }

  function addField() {
    setShowAdvancedEmbed(true)
    setDraft((d) => ({
      ...d,
      embed: {
        ...d.embed,
        fields: [...(d.embed.fields || []), { name: '', value: '', inline: false }],
      },
    }))
  }

  function updateField(index, key, value) {
    setDraft((d) => {
      const fields = [...(d.embed.fields || [])]
      fields[index] = { ...fields[index], [key]: value }
      return { ...d, embed: { ...d.embed, fields } }
    })
  }

  function removeField(index) {
    setDraft((d) => ({
      ...d,
      embed: {
        ...d.embed,
        fields: (d.embed.fields || []).filter((_, i) => i !== index),
      },
    }))
  }

  function setInteractionUi(mode) {
    setDraft((d) => ({
      ...d,
      interaction_mode: mode === 'button' ? 'button' : 'reaction',
    }))
  }

  function patchRole(localId, patch) {
    setDraftRoles((list) =>
      list.map((r) => (r.localId === localId ? { ...r, ...patch } : r)),
    )
  }

  function addReaction() {
    if (draftRoles.length >= MAX_ROLES) return
    if (isVerify && draftRoles.length >= 1) return
    const entry = {
      localId: nextLocalId(),
      id: null,
      ...(isVerify ? VERIFY_DEFAULTS : EMPTY_ROLE),
    }
    setDraftRoles((list) => [...list, entry])
    setEditingLocalId(entry.localId)
  }

  function removeRole(localId) {
    setDraftRoles((list) => list.filter((r) => r.localId !== localId))
    if (editingLocalId === localId) setEditingLocalId(null)
  }

  function setFeedback(key, value) {
    setDraft((d) => ({
      ...d,
      feedback: { ...d.feedback, [key]: value },
    }))
  }

  function buildPayload() {
    const slug = draft.slug.trim() || slugify(draft.label) || 'panel'
    const { panel_options: _po, ...embedRest } = draft.embed
    const feedback = {}
    for (const key of ['added', 'removed', 'already', 'error']) {
      const val = String(draft.feedback?.[key] ?? '').trim()
      if (val) feedback[key] = val
    }
    const { feedback: _feedback, allow_multiple_roles: _allowMultiple, ...panelDraft } =
      draft
    return {
      panel: {
        ...panelDraft,
        slug,
        embed: {
          ...embedRest,
          panel_options: {
            allow_multiple: draft.allow_multiple_roles,
            feedback,
          },
          color:
            typeof draft.embed.color === 'string'
              ? hexColorToInt(draft.embed.color)
              : draft.embed.color,
        },
      },
      roles: needsRoles ? draftRoles : [],
    }
  }

  function validate(forPublish = true) {
    const slug = draft.slug.trim() || slugify(draft.label)
    if (!slug) {
      alert('Give the panel a name.')
      return false
    }
    if (forPublish && !draft.channel_id) {
      alert('Select a channel.')
      return false
    }
    if (forPublish && needsRoles) {
      if (draftRoles.length === 0) {
        alert('Add at least one reaction or button.')
        return false
      }
      for (const r of draftRoles) {
        if (!r.emoji || !r.role_id) {
          alert('Every option needs an emoji and a role.')
          return false
        }
      }
    }
    return true
  }

  async function handleSave() {
    if (!validate(false)) return
    await onSave(buildPayload())
  }

  async function handlePublish() {
    if (!validate(true)) return
    await onPublish(buildPayload())
  }

  const canPublish =
    !busy &&
    (draft.slug.trim() || draft.label.trim()) &&
    draft.channel_id &&
    (!needsRoles || draftRoles.length > 0)

  const panelTitle =
    draft.label ||
    (isVerify ? 'Verify' : isGeneral ? 'Announcement' : 'New Reaction Role')

  if (!templateChosen) {
    return <PanelTemplatePicker onSelect={applyTemplate} />
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Sticky top bar */}
      <div className={adminToolbarSticky}>
        <div className="flex min-w-0 items-center gap-2">
          <Pencil className="size-4 shrink-0 text-zinc-500" />
          <input
            type="text"
            value={draft.label}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                label: e.target.value,
                slug: d.slug || slugify(e.target.value),
              }))
            }
            placeholder={panelTitle}
            className="min-w-0 flex-1 bg-transparent text-lg font-bold text-white outline-none placeholder:text-zinc-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onDiscard}
            className="h-9 rounded-lg px-4 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
          >
            Discard
          </button>
          <button
            type="button"
            disabled={busy || !(draft.slug.trim() || draft.label.trim())}
            onClick={handleSave}
            className="h-9 rounded-lg bg-zinc-800 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
          </button>
          <button
            type="button"
            disabled={!canPublish}
            onClick={handlePublish}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#5865f2] px-4 text-sm font-semibold text-white hover:bg-[#4752c4] disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Publish
          </button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* Editor — grows to fill space */}
        <div className="min-w-0 space-y-4">
      {/* Channel */}
      <CollapsibleSection title="Channel">
        <DiscordEntitySelect
          label="Channel *"
          value={draft.channel_id}
          onChange={(v) => setDraft((d) => ({ ...d, channel_id: v }))}
          options={textChannels}
          placeholder="Select a channel"
        />
        <div className="mt-3">
          <Field
            label="Internal slug"
            value={draft.slug}
            onChange={(v) => setDraft((d) => ({ ...d, slug: v }))}
            placeholder={slugify(draft.label) || 'reaction-roles'}
          />
        </div>
      </CollapsibleSection>

      {/* Message */}
      <CollapsibleSection
        title="Message"
        subtitle="Title, description, and optional embed extras."
      >
        <div className="space-y-4">
          <Field
            label="Title"
            value={draft.embed.title || ''}
            onChange={(v) => setEmbed('title', v)}
            placeholder="**Verify Here**"
          />
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-500">Description</span>
            <textarea
              rows={4}
              className={`${adminControlTextarea} leading-relaxed`}
              value={draft.embed.description || ''}
              onChange={(e) => setEmbed('description', e.target.value)}
              placeholder="React below to get access…"
            />
            <span className="text-[11px] text-zinc-600">
              Markdown supported — **bold**, *italic*, [links](url). Placeholders:{' '}
              {EMBED_PLACEHOLDERS.map((p) => p.token).join(', ')}
            </span>
          </label>
          <div className={adminInset}>
            <p className="text-[11px] font-medium text-zinc-500">Placeholders</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-600">
              {EMBED_PLACEHOLDERS.map((p) => (
                <li key={p.token}>
                  <code className="text-violet-300">{p.token}</code> — {p.description}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-zinc-600">
              Preview substitutes sample values. Tokens are saved in the message as-is for
              Discord.
            </p>
          </div>
          <EmbedColorPicker
            value={draft.embed.color}
            onChange={(hex) => setEmbed('color', hexColorToInt(hex))}
          />

          <button
            type="button"
            onClick={() => setShowAdvancedEmbed((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300"
          >
            <ChevronDown
              className={`size-4 transition-transform ${showAdvancedEmbed ? 'rotate-180' : ''}`}
            />
            Advanced embed options
          </button>

          {showAdvancedEmbed && (
            <div className={`${adminInset} space-y-4 p-4`}>
              <Field
                label="Title link"
                value={draft.embed.url || ''}
                onChange={(v) => setEmbed('url', v)}
                placeholder="https://…"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Author name"
                  value={draft.embed.author?.name || ''}
                  onChange={(v) => setEmbedNested('author', 'name', v)}
                />
                <Field
                  label="Author link"
                  value={draft.embed.author?.url || ''}
                  onChange={(v) => setEmbedNested('author', 'url', v)}
                />
                <Field
                  label="Author icon URL"
                  value={draft.embed.author?.icon_url || ''}
                  onChange={(v) => setEmbedNested('author', 'icon_url', v)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Thumbnail URL"
                  value={draft.embed.thumbnail?.url || ''}
                  onChange={(v) => setEmbedNested('thumbnail', 'url', v)}
                  placeholder="Small image, top-right"
                />
                <Field
                  label="Image URL"
                  value={draft.embed.image?.url || ''}
                  onChange={(v) => setEmbedNested('image', 'url', v)}
                  placeholder="Large image below embed"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Footer text"
                  value={draft.embed.footer?.text || ''}
                  onChange={(v) => setEmbedNested('footer', 'text', v)}
                />
                <Field
                  label="Footer icon URL"
                  value={draft.embed.footer?.icon_url || ''}
                  onChange={(v) => setEmbedNested('footer', 'icon_url', v)}
                />
              </div>

              <div className={`${adminDividerSection} space-y-2`}>
                <span className="text-xs font-medium text-zinc-500">Fields</span>
                <EmbedFieldsEditor
                  fields={draft.embed.fields || []}
                  onAdd={addField}
                  onUpdate={updateField}
                  onRemove={removeField}
                  emptyHint="No fields — optional structured rows."
                />
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Reactions and roles */}
      {needsRoles && (
        <CollapsibleSection
          title="Reactions and roles"
          badge={`${draftRoles.length} / ${MAX_ROLES}`}
        >
          <Segmented
            value={useButtons ? 'button' : 'emoji'}
            onChange={setInteractionUi}
            options={[
              { value: 'emoji', label: 'Emoji' },
              { value: 'button', label: 'Button' },
              { value: 'dropdown', label: 'Dropdown', disabled: true },
            ]}
            className="mb-4"
          />
          {!isVerify && (
            <>
              <Toggle
                checked={draft.allow_multiple_roles}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, allow_multiple_roles: v }))
                }
                label="Allow members to pick up roles from multiple reactions"
                className="mb-5"
              />
            </>
          )}

          <div className="space-y-2">
            {draftRoles.map((role) => (
              <div key={role.localId}>
                <div className={`${adminInset} flex items-center gap-2 p-2`}>
                  {useEmoji && (
                    <EmojiPickerField
                      value={role.emoji}
                      onChange={(emoji) => patchRole(role.localId, { emoji })}
                    />
                  )}
                  {useButtons && (
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingLocalId(
                            editingLocalId === role.localId ? null : role.localId,
                          )
                        }
                        className="block"
                        title="Open button options"
                      >
                        <DiscordButtonChip
                          label={role.label}
                          emoji={role.button_emoji || role.emoji}
                          style={role.button_style}
                          showChevron
                          expanded={editingLocalId === role.localId}
                        />
                      </button>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <DiscordEntitySelect
                      value={role.role_id}
                      onChange={(v) => patchRole(role.localId, { role_id: v })}
                      options={roleOptions}
                      placeholder="Select a role"
                      compact
                    />
                  </div>
                  {!isVerify && (
                    <button
                      type="button"
                      onClick={() => removeRole(role.localId)}
                      className="shrink-0 rounded-lg p-2 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {useButtons && editingLocalId === role.localId && (
                  <div className={`mt-2 ${adminInset} p-4`}>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                      Button editor
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <label className="space-y-1">
                        <span className="text-xs text-zinc-500">Emoji</span>
                        <EmojiPickerField
                          value={role.button_emoji || role.emoji}
                          onChange={(emoji) =>
                            patchRole(role.localId, { button_emoji: emoji })
                          }
                        />
                      </label>
                      <label className="min-w-[120px] flex-1 space-y-1">
                        <span className="text-xs text-zinc-500">Button title</span>
                        <input
                          type="text"
                          value={role.label}
                          onChange={(e) =>
                            patchRole(role.localId, { label: e.target.value })
                          }
                          placeholder='e.g. "Blue"'
                          className={adminControl}
                        />
                      </label>
                    </div>
                    <div className="mt-3">
                      <span className="text-xs text-zinc-500">Color</span>
                      <div className="mt-2 flex gap-2">
                        {BUTTON_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() =>
                              patchRole(role.localId, { button_style: c.value })
                            }
                            className={`relative size-8 rounded-full ${c.bg} ${
                              role.button_style === c.value
                                ? `ring-2 ${c.ring} ring-offset-2 ring-offset-[#0c0c0e]`
                                : ''
                            }`}
                          >
                            {role.button_style === c.value && (
                              <span className="text-xs text-white">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {(isVerify ? draftRoles.length === 0 : draftRoles.length < MAX_ROLES) && (
              <button
                type="button"
                onClick={addReaction}
                disabled={busy}
                className={adminAddDashed}
              >
                <Plus className="size-4" />
                Add new reaction
              </button>
            )}
          </div>
        </CollapsibleSection>
      )}

      {needsRoles && (
        <CollapsibleSection
          title="Ephemeral feedback"
          subtitle="Private confirmation — only the member who clicked sees this"
        >
          <p className="mb-4 text-xs leading-relaxed text-zinc-500">
            {isVerify
              ? useButtons
                ? 'Shown after a member clicks the Verify button.'
                : 'Verify is set to emoji reactions, so private ephemeral feedback is unavailable (Discord limitation).'
              : useButtons
                ? 'Shown after a member clicks a role button.'
                : 'Switch to Button mode in Reactions and roles for ephemeral feedback. Emoji-only reactions assign roles without a private message (Discord limitation).'}
          </p>
          <ul className="mb-4 space-y-0.5 text-[11px] text-zinc-600">
            {EMBED_PLACEHOLDERS.map((p) => (
              <li key={p.token}>
                <code className="text-violet-300">{p.token}</code> — {p.description}
              </li>
            ))}
          </ul>
          <div className="space-y-3">
            <FeedbackField
              label={isVerify ? 'Verified message' : 'Role added message'}
              value={draft.feedback?.added ?? ''}
              onChange={(v) => setFeedback('added', v)}
              preview={resolvePlaceholders(draft.feedback?.added ?? '', {
                ...PREVIEW_PLACEHOLDER_CONTEXT,
                role: 'Member',
              })}
            />
            {!isVerify && (
              <FeedbackField
                label="Role removed message"
                value={draft.feedback?.removed ?? ''}
                onChange={(v) => setFeedback('removed', v)}
                preview={resolvePlaceholders(draft.feedback?.removed ?? '', {
                  ...PREVIEW_PLACEHOLDER_CONTEXT,
                  role: 'Member',
                })}
              />
            )}
            <FeedbackField
              label={isVerify ? 'Already verified message' : 'Already has role message'}
              value={draft.feedback?.already ?? ''}
              onChange={(v) => setFeedback('already', v)}
              preview={resolvePlaceholders(draft.feedback?.already ?? '', {
                ...PREVIEW_PLACEHOLDER_CONTEXT,
                role: 'Member',
              })}
            />
            <FeedbackField
              label="Error message"
              value={draft.feedback?.error ?? ''}
              onChange={(v) => setFeedback('error', v)}
              preview={resolvePlaceholders(draft.feedback?.error ?? '', {
                ...PREVIEW_PLACEHOLDER_CONTEXT,
                role: 'Member',
              })}
            />
          </div>
        </CollapsibleSection>
      )}

      {panelId && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDeleteMessage(panelId)}
            className="inline-flex items-center gap-1.5 text-xs text-red-400/80 hover:text-red-400"
          >
            <Trash2 className="size-3.5" />
            Delete panel permanently
          </button>
        </div>
      )}
        </div>

        {/* Live preview — card hugs Discord message width */}
        <div className="w-fit max-w-full shrink-0 lg:sticky lg:top-[4.5rem]">
          <div
            className={adminPreviewPanel}
            style={{ width: DISCORD_MESSAGE_PREVIEW_WIDTH + 32, maxWidth: '100%' }}
          >
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Live preview
            </p>
            <DiscordMessagePreview
              embed={previewEmbed}
              interactionMode={
                isGeneral ? null : draft.interaction_mode
              }
              roles={needsRoles ? previewRoles : []}
            />
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
              Sample member: {PREVIEW_PLACEHOLDER_CONTEXT.username} ·{' '}
              {PREVIEW_PLACEHOLDER_CONTEXT.server}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border-0 bg-[#0c0c0e] px-3 text-sm text-zinc-100 ring-1 ring-zinc-800 outline-none focus:ring-violet-500/50"
      />
    </label>
  )
}

function FeedbackField({ label, value, onChange, preview }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-[#0c0c0e] px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 outline-none focus:ring-violet-500/50"
      />
      {preview ? (
        <p className="text-[11px] text-zinc-600">
          Preview: <span className="text-zinc-400">{preview}</span>
        </p>
      ) : null}
    </label>
  )
}

function Toggle({ checked, onChange, label, className = '' }) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-4 ${className}`}
    >
      <span className="text-sm text-zinc-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#5865f2]' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}

function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div
      className={`inline-flex rounded-xl bg-[#0c0c0e] p-1 ring-1 ring-zinc-800 ${className}`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={opt.disabled}
          onClick={() => !opt.disabled && onChange(opt.value)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            value === opt.value
              ? 'bg-[#2b2d31] text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
