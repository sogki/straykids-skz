import { useEffect, useRef, useState } from 'react'
import { SmilePlus } from 'lucide-react'

function isCustomDiscordEmoji(value) {
  return /^<(a)?:\w+:\d+>$/.test(String(value || '').trim())
}

function displayEmoji(value) {
  const v = String(value || '').trim()
  if (!v) return null
  if (isCustomDiscordEmoji(v)) {
    const match = v.match(/^<(a)?:(\w+):(\d+)>$/)
    if (!match) return v
    const animated = match[1] ? 'a' : ''
    const name = match[2]
    const id = match[3]
    return (
      <img
        src={`https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?size=44`}
        alt={name}
        className="size-6 object-contain"
        draggable={false}
      />
    )
  }
  return <span className="text-xl leading-none">{v}</span>
}

export default function EmojiPickerField({
  value,
  onChange,
  placeholder = '🙂',
  className = '',
  compact = false,
}) {
  const [open, setOpen] = useState(false)
  const [picker, setPicker] = useState(null)
  const [customDraft, setCustomDraft] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open || picker) return
    Promise.all([import('@emoji-mart/react'), import('@emoji-mart/data')]).then(
      ([reactMod, dataMod]) => {
        setPicker({ Picker: reactMod.default, data: dataMod.default })
      },
    )
  }, [open, picker])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function selectEmoji(emoji) {
    if (emoji?.native) {
      onChange(emoji.native)
      setOpen(false)
    }
  }

  function commitCustom() {
    const trimmed = customDraft.trim()
    if (!trimmed) return
    onChange(trimmed)
    setCustomDraft('')
    setOpen(false)
  }

  const sizeClass = compact ? 'size-10' : 'size-10'

  return (
    <div ref={wrapRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        aria-label="Pick emoji"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex ${sizeClass} items-center justify-center rounded-lg bg-[#18181b] ring-1 ring-zinc-800 transition-colors hover:bg-zinc-800 hover:ring-zinc-700`}
      >
        {value ? (
          displayEmoji(value)
        ) : (
          <SmilePlus className="size-4 text-zinc-500" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Emoji picker"
          className="admin-dropdown absolute left-0 top-full z-50 mt-2"
        >
          {picker ? (
            <picker.Picker
              data={picker.data}
              theme="dark"
              previewPosition="none"
              skinTonePosition="search"
              maxFrequentRows={1}
              perLine={8}
              onEmojiSelect={selectEmoji}
            />
          ) : (
            <div className="flex h-80 w-80 items-center justify-center text-sm text-zinc-500">
              Loading…
            </div>
          )}
          <div className="border-t border-white/[0.06] p-2">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              Custom Discord emoji
            </p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitCustom()
                }}
                placeholder="<:name:123456789>"
                className="min-w-0 flex-1 rounded-lg bg-[#0c0c0e] px-2 py-1.5 font-mono text-xs text-zinc-200 ring-1 ring-zinc-800 outline-none focus:ring-violet-500/50"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={commitCustom}
                className="shrink-0 rounded-lg bg-violet-500/20 px-2.5 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/30"
              >
                Use
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
