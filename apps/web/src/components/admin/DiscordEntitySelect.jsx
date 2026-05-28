/**
 * Dropdown populated from skz_bot_discord_cache (synced by the bot).
 */
export default function DiscordEntitySelect({
  label,
  hint,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  allowEmpty = true,
  compact = false,
}) {
  const selectClass = compact
    ? 'h-9 w-full rounded-lg border-0 bg-[#18181b] px-3 text-sm text-zinc-200 outline-none ring-1 ring-zinc-800 focus:ring-violet-500/50 disabled:opacity-50'
    : 'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500 disabled:opacity-50'

  return (
    <label className="block space-y-1">
      {label && (
        <span
          className={
            compact
              ? 'sr-only'
              : 'text-xs font-semibold uppercase tracking-wider text-zinc-400'
          }
        >
          {label}
        </span>
      )}
      <select
        className={selectClass}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={compact ? label || placeholder : undefined}
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.entity_id} value={opt.entity_id}>
            {opt.name}
            {opt.extra?.kind === 'voice' ? ' (voice)' : ''}
          </option>
        ))}
      </select>
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      {!options.length && (
        <span className="block text-xs text-amber-400/90">
          No options cached yet — save guild ID, run the bot, then click Sync Discord
          or run /reload in Discord.
        </span>
      )}
    </label>
  )
}
