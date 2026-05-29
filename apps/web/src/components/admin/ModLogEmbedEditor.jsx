import {
  DEFAULT_MOD_LOG_EMBEDS,
  mergeModLogEmbedForEditor,
} from '@/services/skzAdminBot'
import {
  MOD_LOG_MEMBER_PLACEHOLDERS,
  MOD_LOG_MESSAGE_PLACEHOLDERS,
  MOD_LOG_PREVIEW_MEMBER,
  MOD_LOG_PREVIEW_MESSAGE_BULK,
  MOD_LOG_PREVIEW_MESSAGE_DELETE,
  MOD_LOG_PREVIEW_MESSAGE_EDIT,
} from '@skz/shared'
import EmbedTemplateEditor from '@/components/admin/EmbedTemplateEditor'

const PREVIEW_BY_TEMPLATE = {
  member: MOD_LOG_PREVIEW_MEMBER,
  message_delete: MOD_LOG_PREVIEW_MESSAGE_DELETE,
  message_edit: MOD_LOG_PREVIEW_MESSAGE_EDIT,
  message_bulk_delete: MOD_LOG_PREVIEW_MESSAGE_BULK,
}

const PLACEHOLDERS_BY_TEMPLATE = {
  member: MOD_LOG_MEMBER_PLACEHOLDERS,
  message_delete: MOD_LOG_MESSAGE_PLACEHOLDERS,
  message_edit: MOD_LOG_MESSAGE_PLACEHOLDERS,
  message_bulk_delete: MOD_LOG_MESSAGE_PLACEHOLDERS,
}

export default function ModLogEmbedEditor({
  templateId,
  embed,
  onChange,
  onResetDefault,
  botPreview = null,
}) {
  return (
    <EmbedTemplateEditor
      botPreview={botPreview}
      templateId={templateId}
      embed={embed}
      onChange={onChange}
      onResetDefault={onResetDefault}
      mergeEmbed={mergeModLogEmbedForEditor}
      defaultEmbeds={DEFAULT_MOD_LOG_EMBEDS}
      placeholders={PLACEHOLDERS_BY_TEMPLATE[templateId] ?? MOD_LOG_MESSAGE_PLACEHOLDERS}
      previewCtx={PREVIEW_BY_TEMPLATE[templateId] ?? MOD_LOG_PREVIEW_MESSAGE_DELETE}
      titleHint='Use {event_title} for "Member joined", "Message deleted", etc.'
    />
  )
}
