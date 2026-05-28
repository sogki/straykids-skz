import { Palette } from 'lucide-react'
import { intColorToHex, hexColorToInt } from '@/services/skzAdminBot'
import DiscordEmbedPreview from '@/components/admin/DiscordEmbedPreview'
import {
  DISCORD_EMBED_MAX_WIDTH,
  DISCORD_MESSAGE_PREVIEW_WIDTH,
} from '@/components/admin/discordPreviewConstants'

export function MessageReactionsPreview({ interactionMode, roles }) {
  if (!roles?.length) return null

  const showButtons = interactionMode === 'button'
  const showReactions = interactionMode === 'reaction'

  const BUTTON_STYLE_CLASS = {
    primary: 'bg-[#5865f2] text-white',
    success: 'bg-[#248046] text-white',
    danger: 'bg-[#da373c] text-white',
    secondary: 'bg-[#4e5058] text-white',
  }

  return (
    <>
      {showButtons && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <span
              key={`btn-${r.localId || r.id}`}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${
                BUTTON_STYLE_CLASS[r.button_style] || BUTTON_STYLE_CLASS.primary
              }`}
            >
              {(r.button_emoji || r.emoji) && (
                <span className="text-sm leading-none">{r.button_emoji || r.emoji}</span>
              )}
              {r.label || r.category}
            </span>
          ))}
        </div>
      )}
      {showReactions && (
        <div className={`mt-1 flex flex-wrap items-center gap-1 ${showButtons ? 'mt-2' : ''}`}>
          {roles.map((r) => (
            <span
              key={r.localId || r.id || r.emoji}
              className="inline-flex items-center gap-1 rounded-md bg-[#2b2d31] px-1.5 py-0.5 text-sm text-[#dbdee1] ring-1 ring-[#3f4147]"
            >
              {r.emoji || '•'}
              <span className="text-xs text-[#949ba4]">1</span>
            </span>
          ))}
        </div>
      )}
    </>
  )
}

/**
 * Full Discord message chrome — bot avatar, APP tag, timestamp, embed at Discord width.
 */
export default function DiscordMessagePreview({
  botName = 'SKZ Arcade',
  embed,
  interactionMode,
  roles = [],
  onColorChange,
}) {
  const now = new Date()
  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div
      className="rounded-lg bg-[#313338] p-3"
      style={{ width: DISCORD_MESSAGE_PREVIEW_WIDTH, maxWidth: '100%' }}
    >
      <div className="flex gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white">
          SKZ
        </div>
        <div
          className="min-w-0 flex-1"
          style={{ maxWidth: DISCORD_EMBED_MAX_WIDTH }}
        >
          <div className="mb-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
            <span className="text-[15px] font-semibold leading-tight text-[#f2f3f5]">
              {botName}
            </span>
            <span className="rounded-[3px] bg-[#5865f2] px-1 py-px text-[10px] font-bold leading-none text-white">
              APP
            </span>
            <span className="text-xs leading-tight text-[#949ba4]">
              Today at {time}
            </span>
          </div>

          {(onColorChange) && (
            <div className="mb-1 flex gap-1">
              <label
                className="flex size-7 cursor-pointer items-center justify-center rounded bg-[#2b2d31] text-[#b5bac1] hover:text-white"
                title="Accent colour"
              >
                <Palette className="size-3.5" />
                <input
                  type="color"
                  className="sr-only"
                  value={intColorToHex(embed?.color ?? 0x5865f2)}
                  onChange={(e) => onColorChange(hexColorToInt(e.target.value))}
                />
              </label>
            </div>
          )}

          <DiscordEmbedPreview
            embed={embed}
            interactionMode={null}
            roles={[]}
            compact
            showInteractions={false}
          />

          <MessageReactionsPreview interactionMode={interactionMode} roles={roles} />
        </div>
      </div>
    </div>
  )
}
