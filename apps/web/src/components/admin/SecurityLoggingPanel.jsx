import DiscordEntitySelect from '@/components/admin/DiscordEntitySelect'
import SubCard from '@/components/admin/SecuritySubCard'

/**
 * @param {{
 *   draft: Record<string, string>,
 *   setDraft: (fn: (prev: Record<string, string>) => Record<string, string>) => void,
 *   channels: Array<{ entity_id: string, name: string }>,
 *   readOnly?: boolean,
 *   onViewLogs?: () => void,
 * }} props
 */
export default function SecurityLoggingPanel({
  draft,
  setDraft,
  channels,
  readOnly = false,
  onViewLogs,
}) {
  const ageLog = Boolean(draft.account_age_log_channel_id?.trim())
  const filterLog = Boolean(draft.content_filter_log_channel_id?.trim())

  return (
    <>
      <SubCard
        title="Discord log channels"
        description="The bot posts embeds when it kicks, bans, or rejects someone. Events are also saved to the moderation log history."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <DiscordEntitySelect
            label="Account age gate log channel"
            hint="Join/verify rejections — kick, ban, or failed action."
            value={draft.account_age_log_channel_id}
            onChange={(v) => setDraft((p) => ({ ...p, account_age_log_channel_id: v }))}
            options={channels}
            placeholder="Select channel"
            disabled={readOnly}
          />
          <DiscordEntitySelect
            label="Content filter log channel"
            hint="Deleted messages, matched text, and member kick/ban."
            value={draft.content_filter_log_channel_id}
            onChange={(v) => setDraft((p) => ({ ...p, content_filter_log_channel_id: v }))}
            options={channels}
            placeholder="Select channel"
            disabled={readOnly}
          />
        </div>
        <p className="text-xs text-zinc-500">
          {ageLog || filterLog
            ? `${[ageLog && 'Age gate', filterLog && 'Content filter'].filter(Boolean).join(' and ')} logging is configured.`
            : 'Pick at least one channel so staff see security actions in Discord.'}
        </p>
      </SubCard>

      <SubCard
        title="Moderation log history"
        description="Every age-gate rejection and content-filter action is stored in the database for the admin panel."
      >
        <ul className="space-y-2 text-sm text-zinc-400">
          <li>
            <span className="font-medium text-zinc-300">Account age rejected</span> — young
            account kicked or banned on join
          </li>
          <li>
            <span className="font-medium text-zinc-300">Content filter action</span> — blocked
            text matched, message removed, member action taken
          </li>
        </ul>
        {onViewLogs ? (
          <button
            type="button"
            onClick={onViewLogs}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-zinc-800 px-3 text-sm font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-zinc-700"
          >
            Open moderation logs
          </button>
        ) : null}
      </SubCard>
    </>
  )
}
