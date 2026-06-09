import DiscordChannelMultiSelect from '@/components/admin/DiscordChannelMultiSelect'
import SubCard from '@/components/admin/SecuritySubCard'
import { exemptChannelIdsToValue, parseExemptChannelIds } from '@/services/contentFilterRules'

/**
 * @param {{
 *   draft: Record<string, string>,
 *   setDraft: (fn: (prev: Record<string, string>) => Record<string, string>) => void,
 *   channels: Array<{ entity_id: string, name: string }>,
 *   readOnly?: boolean,
 * }} props
 */
export default function SecurityExemptChannelsPanel({
  draft,
  setDraft,
  channels,
  readOnly = false,
}) {
  return (
    <SubCard
      title="Exempt channels"
      description="The content filter does not run in these channels — useful for staff mod rooms."
    >
      <DiscordChannelMultiSelect
        label="Channels where filtering is disabled"
        hint="Moderators and full admins are always exempt everywhere. Exempt channels are an extra safeguard for sensitive staff discussions."
        valueIds={parseExemptChannelIds(draft.content_filter_exempt_channel_ids)}
        onChange={(ids) =>
          setDraft((p) => ({
            ...p,
            content_filter_exempt_channel_ids: exemptChannelIdsToValue(ids),
          }))
        }
        options={channels}
        readOnly={readOnly}
      />
    </SubCard>
  )
}
