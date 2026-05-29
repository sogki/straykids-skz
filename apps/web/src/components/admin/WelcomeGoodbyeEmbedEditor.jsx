import {
  DEFAULT_WELCOME_GOODBYE_EMBEDS,
  mergeWelcomeGoodbyeEmbedForEditor,
} from '@/services/skzAdminBot'
import {
  GOODBYE_PREVIEW_CTX,
  MEMBER_GREETING_PLACEHOLDERS,
  WELCOME_PREVIEW_CTX,
} from '@skz/shared'
import EmbedTemplateEditor from '@/components/admin/EmbedTemplateEditor'

const PREVIEW_BY_TEMPLATE = {
  welcome: WELCOME_PREVIEW_CTX,
  goodbye: GOODBYE_PREVIEW_CTX,
}

export default function WelcomeGoodbyeEmbedEditor({
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
      mergeEmbed={mergeWelcomeGoodbyeEmbedForEditor}
      defaultEmbeds={DEFAULT_WELCOME_GOODBYE_EMBEDS}
      placeholders={MEMBER_GREETING_PLACEHOLDERS}
      previewCtx={PREVIEW_BY_TEMPLATE[templateId] ?? WELCOME_PREVIEW_CTX}
      titleHint="Use {event_title} to override the embed title, or leave blank to use the title field."
    />
  )
}
