import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import CollapsibleSection from '@/components/admin/CollapsibleSection'
import EmbedFieldsEditor from '@/components/admin/EmbedFieldsEditor'
import DiscordMessagePreview from '@/components/admin/DiscordMessagePreview'
import EmbedColorPicker from '@/components/admin/EmbedColorPicker'
import { DISCORD_MESSAGE_PREVIEW_WIDTH } from '@/components/admin/discordPreviewConstants'
import { EMPTY_EMBED, hexColorToInt } from '@/services/skzAdminBot'
import {
  adminCalloutInfo,
  adminControl,
  adminControlTextarea,
  adminDividerSection,
  adminField,
  adminFieldHint,
  adminFieldLabel,
  adminInset,
} from '@/components/admin/adminUi'
import { resolveModLogPlaceholders } from '@skz/shared'

function Field({ label, value, onChange, placeholder, hint }) {
  return (
    <label className={adminField}>
      <span className={adminFieldLabel}>{label}</span>
      <input
        type="text"
        className={adminControl}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint ? <span className={adminFieldHint}>{hint}</span> : null}
    </label>
  )
}

/**
 * Shared embed editor (mod logs, welcome/goodbye, panels-style JSON).
 */
export default function EmbedTemplateEditor({
  templateId,
  embed,
  onChange,
  onResetDefault,
  mergeEmbed,
  defaultEmbeds,
  placeholders,
  previewCtx,
  titleHint = 'Use {event_title} or your own title text.',
}) {
  const baseEmbed = useMemo(
    () => mergeEmbed(embed, templateId),
    [embed, templateId, mergeEmbed],
  )

  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    setShowAdvanced((baseEmbed.fields?.length ?? 0) > 0)
  }, [templateId, baseEmbed.fields?.length])

  const previewEmbed = useMemo(
    () => resolveModLogPlaceholders(baseEmbed, previewCtx),
    [baseEmbed, previewCtx],
  )

  function emit(next) {
    onChange(mergeEmbed(next, templateId))
  }

  function setEmbed(key, value) {
    emit({ ...baseEmbed, [key]: value })
  }

  function setEmbedNested(section, key, value) {
    emit({
      ...baseEmbed,
      [section]: { ...(baseEmbed[section] || {}), [key]: value },
    })
  }

  function addField() {
    setShowAdvanced(true)
    emit({
      ...baseEmbed,
      fields: [...(baseEmbed.fields || []), { name: '', value: '', inline: false }],
    })
  }

  function updateField(index, key, value) {
    const fields = [...(baseEmbed.fields || [])]
    fields[index] = { ...fields[index], [key]: value }
    emit({ ...baseEmbed, fields })
  }

  function removeField(index) {
    emit({
      ...baseEmbed,
      fields: (baseEmbed.fields || []).filter((_, i) => i !== index),
    })
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 space-y-4">
        <p className={`${adminCalloutInfo} text-xs`}>
          The preview substitutes sample data for <code className="text-violet-300">{'{placeholders}'}</code>.
          Fields below are what you edit — they are saved exactly as written.
        </p>

        <CollapsibleSection
          title="Embed message"
          subtitle="Title, description, color, and field rows."
        >
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const defaults = defaultEmbeds[templateId] ?? EMPTY_EMBED
                emit({
                  ...defaults,
                  fields: [...(defaults.fields || [])],
                })
                onResetDefault?.()
              }}
              className="text-xs font-medium text-violet-300 hover:text-violet-200"
            >
              Reset to default template
            </button>
          </div>
          <div className="space-y-4">
            <Field
              label="Title"
              value={baseEmbed.title}
              onChange={(v) => setEmbed('title', v)}
              placeholder="{event_title}"
              hint={titleHint}
            />
            <label className={adminField}>
              <span className={adminFieldLabel}>Description</span>
              <textarea
                rows={3}
                className={adminControlTextarea}
                value={baseEmbed.description ?? ''}
                onChange={(e) => setEmbed('description', e.target.value)}
                placeholder="Optional — most templates use fields instead"
              />
            </label>
            <EmbedColorPicker
              value={baseEmbed.color ?? EMPTY_EMBED.color}
              onChange={(hex) => setEmbed('color', hexColorToInt(hex))}
            />
            <div className={adminInset}>
              <p className="text-[11px] font-medium text-zinc-500">Placeholders</p>
              <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-[11px] text-zinc-600">
                {placeholders.map((p) => (
                  <li key={p.token}>
                    <code className="text-violet-300">{p.token}</code> — {p.description}
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${adminDividerSection} space-y-2`}>
              <span className={adminFieldLabel}>Embed fields</span>
              <p className="text-xs text-zinc-500">
                Rows map to the preview body — edit name, value, and inline per row.
              </p>
              <EmbedFieldsEditor
                fields={baseEmbed.fields || []}
                onAdd={addField}
                onUpdate={updateField}
                onRemove={removeField}
                emptyHint='No fields yet. Use "Reset to default template" to restore the starter layout.'
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300"
            >
              <ChevronDown
                className={`size-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              />
              Thumbnail, footer, image, and title link
            </button>
            {showAdvanced && (
              <div className={`${adminInset} space-y-4 p-4`}>
                <Field
                  label="Title link"
                  value={baseEmbed.url}
                  onChange={(v) => setEmbed('url', v)}
                  placeholder="Optional URL"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Thumbnail URL"
                    value={baseEmbed.thumbnail?.url}
                    onChange={(v) => setEmbedNested('thumbnail', 'url', v)}
                    placeholder="{avatar_url}"
                  />
                  <Field
                    label="Image URL"
                    value={baseEmbed.image?.url}
                    onChange={(v) => setEmbedNested('image', 'url', v)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Footer text"
                    value={baseEmbed.footer?.text}
                    onChange={(v) => setEmbedNested('footer', 'text', v)}
                  />
                  <Field
                    label="Footer icon URL"
                    value={baseEmbed.footer?.icon_url}
                    onChange={(v) => setEmbedNested('footer', 'icon_url', v)}
                  />
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
      <div
        className="sticky top-20 shrink-0"
        style={{ width: DISCORD_MESSAGE_PREVIEW_WIDTH }}
      >
        <p className="mb-2 text-xs font-medium text-zinc-500">Discord preview (sample data)</p>
        <DiscordMessagePreview embed={previewEmbed} />
      </div>
    </div>
  )
}
