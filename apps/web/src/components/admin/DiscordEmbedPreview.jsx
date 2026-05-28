import { intColorToHex } from '@/services/skzAdminBot'
import DiscordMarkdown from '@/utils/discordMarkdown'
import { DISCORD_EMBED_MAX_WIDTH } from '@/components/admin/discordPreviewConstants'

const BUTTON_COLORS = {
  primary: 'bg-[#5865f2] hover:bg-[#4752c4]',
  secondary: 'bg-[#4e5058] hover:bg-[#6d6f78]',
  success: 'bg-[#248046] hover:bg-[#1a6334]',
  danger: 'bg-[#da373c] hover:bg-[#a12828]',
}

function EmbedFields({ fields }) {
  if (!fields.length) return null

  const rows = []
  let row = []

  for (const field of fields) {
    if (field.inline && row.length < 3 && row.every((f) => f.inline)) {
      row.push(field)
    } else {
      if (row.length) rows.push(row)
      row = field.inline ? [field] : []
      if (!field.inline) {
        rows.push([field])
      }
    }
  }
  if (row.length) rows.push(row)

  return (
    <div className="space-y-2 pt-1">
      {rows.map((group, gi) => (
        <div
          key={gi}
          className={
            group.length > 1 && group.every((f) => f.inline)
              ? 'grid gap-2'
              : ''
          }
          style={
            group.length > 1 && group.every((f) => f.inline)
              ? { gridTemplateColumns: `repeat(${group.length}, minmax(0, 1fr))` }
              : undefined
          }
        >
          {group.map((f, fi) => (
            <div key={fi}>
              <DiscordMarkdown
                text={f.name}
                className="text-xs font-semibold text-[#f2f3f5]"
                as="div"
              />
              <DiscordMarkdown
                text={f.value}
                className="mt-0.5 text-xs text-[#dbdee1]"
                as="div"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Live preview of a Discord embed — matches Discord dark theme & 432px max width.
 */
export default function DiscordEmbedPreview({
  embed,
  interactionMode,
  roles = [],
  compact = false,
  showInteractions = true,
}) {
  const color = intColorToHex(embed?.color ?? 0x5865f2)
  const fields = Array.isArray(embed?.fields)
    ? embed.fields.filter((f) => f?.name || f?.value)
    : []
  const thumbnailUrl = embed?.thumbnail?.url?.trim()
  const imageUrl = embed?.image?.url?.trim()
  const authorName = embed?.author?.name?.trim()
  const authorIcon = embed?.author?.icon_url?.trim()
  const authorUrl = embed?.author?.url?.trim()
  const footerText = embed?.footer?.text?.trim()
  const footerIcon = embed?.footer?.icon_url?.trim()
  const titleUrl = embed?.url?.trim()

  const inner = (
    <div
      className="w-full max-w-full"
      style={{ maxWidth: compact ? undefined : DISCORD_EMBED_MAX_WIDTH }}
    >
      <div className="flex gap-3">
        <div
          className="mt-0.5 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: color, minHeight: '1.5rem' }}
        />
        <div className="relative min-w-0 flex-1 space-y-0.5">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt=""
              className="absolute right-0 top-0 size-20 rounded object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}

          {authorName && (
            <div className="flex items-center gap-2 pr-20">
              {authorIcon && (
                <img
                  src={authorIcon}
                  alt=""
                  className="size-5 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              {authorUrl ? (
                <a
                  href={authorUrl}
                  className="text-xs font-semibold text-[#f2f3f5] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {authorName}
                </a>
              ) : (
                <span className="text-xs font-semibold text-[#f2f3f5]">
                  {authorName}
                </span>
              )}
            </div>
          )}

          {embed?.title &&
            (titleUrl ? (
              <a
                href={titleUrl}
                className="block text-base font-semibold leading-snug text-[#00a8fc] hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                <DiscordMarkdown text={embed.title} as="span" />
              </a>
            ) : (
              <DiscordMarkdown
                text={embed.title}
                className="text-base font-semibold leading-snug text-[#f2f3f5]"
                as="div"
              />
            ))}

          {embed?.description && (
            <DiscordMarkdown
              text={embed.description}
              className="space-y-0.5 text-sm leading-snug"
            />
          )}

          <EmbedFields fields={fields} />

          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="mt-2 max-h-[300px] w-full rounded object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}

          {footerText && (
            <div className="flex items-center gap-2 pt-1.5">
              {footerIcon && (
                <img
                  src={footerIcon}
                  alt=""
                  className="size-4 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <DiscordMarkdown
                text={footerText}
                className="text-xs text-[#949ba4]"
                as="span"
              />
            </div>
          )}
        </div>
      </div>

      {showInteractions &&
        (interactionMode === 'reaction' || interactionMode === 'both') &&
        roles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {roles.map((r) => (
              <span
                key={r.localId || r.id || r.emoji}
                className="inline-flex items-center gap-1 rounded-md border border-[#3f4147] bg-[#2b2d31] px-1.5 py-0.5 text-sm"
              >
                {r.emoji || r.button_emoji || '•'}
              </span>
            ))}
          </div>
        )}

      {showInteractions &&
        (interactionMode === 'button' || interactionMode === 'both') &&
        roles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <span
                key={`btn-${r.localId || r.id}`}
                className={`rounded px-2.5 py-1 text-xs font-medium text-white ${BUTTON_COLORS[r.button_style] || BUTTON_COLORS.secondary}`}
              >
                {r.label || r.category}
              </span>
            ))}
          </div>
        )}
    </div>
  )

  if (compact) {
    return inner
  }

  return (
    <div
      className="rounded-lg border border-[#1e1f22] bg-[#313338] p-4"
      style={{ maxWidth: DISCORD_EMBED_MAX_WIDTH + 32 }}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Discord preview
      </p>
      {inner}
    </div>
  )
}
