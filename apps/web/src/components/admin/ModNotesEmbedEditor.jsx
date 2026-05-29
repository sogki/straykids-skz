import {
  DEFAULT_MOD_NOTES_VIEW_EMBED,
  mergeModNotesViewEmbedForEditor,
} from '@/services/skzAdminBot'
import {
  MOD_NOTES_VIEW_PLACEHOLDERS,
  MOD_NOTES_VIEW_PREVIEW_CTX,
} from '@skz/shared'
import EmbedTemplateEditor from '@/components/admin/EmbedTemplateEditor'

export default function ModNotesEmbedEditor({ embed, onChange, onResetDefault, botPreview = null }) {
  return (
    <EmbedTemplateEditor
      botPreview={botPreview}
      templateId="view"
      embed={embed}
      onChange={onChange}
      onResetDefault={onResetDefault}
      mergeEmbed={mergeModNotesViewEmbedForEditor}
      defaultEmbeds={{ view: DEFAULT_MOD_NOTES_VIEW_EMBED }}
      placeholders={MOD_NOTES_VIEW_PLACEHOLDERS}
      previewCtx={MOD_NOTES_VIEW_PREVIEW_CTX}
      titleHint="Note text is listed as embed fields in /notes — edit the header and footer here."
    />
  )
}
