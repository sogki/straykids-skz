import { useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Palette } from 'lucide-react'
import { intColorToHex } from '@/services/skzAdminBot'
import '@/styles/embedColorPicker.css'

const DISCORD_PRESETS = [
  '#5865f2',
  '#57f287',
  '#fee75c',
  '#eb459e',
  '#ed4245',
  '#ffffff',
  '#23272a',
  '#99aab5',
]

export default function EmbedColorPicker({ value, onChange, label = 'Accent colour' }) {
  const [open, setOpen] = useState(false)
  const [hexDraft, setHexDraft] = useState(intColorToHex(value))
  const wrapRef = useRef(null)

  const hex = intColorToHex(value)

  useEffect(() => {
    setHexDraft(hex)
  }, [hex])

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

  function commitHex(nextHex) {
    onChange(nextHex)
    setHexDraft(nextHex)
  }

  function commitDraftInput() {
    const normalized = hexDraft.trim().startsWith('#') ? hexDraft.trim() : `#${hexDraft.trim()}`
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      commitHex(normalized.toLowerCase())
    } else {
      setHexDraft(hex)
    }
  }

  return (
    <div ref={wrapRef} className="relative flex items-center gap-3">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-lg bg-[#18181b] ring-1 ring-zinc-800 transition-colors hover:bg-zinc-800 hover:ring-zinc-700"
      >
        <Palette className="size-4 text-zinc-400" aria-hidden="true" />
        <span
          className="absolute bottom-1 right-1 size-2 rounded-full ring-1 ring-[#18181b]"
          style={{ backgroundColor: hex }}
          aria-hidden="true"
        />
      </button>
      <span className="font-mono text-xs text-zinc-600">{hex}</span>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-2 w-60 rounded-xl border border-zinc-800 bg-[#18181b] p-3 shadow-xl shadow-black/40"
        >
          <HexColorPicker
            color={hex}
            onChange={commitHex}
            className="embed-color-picker"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DISCORD_PRESETS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Use ${swatch}`}
                onClick={() => commitHex(swatch)}
                className={`size-6 rounded-md ring-1 ring-zinc-700 transition-transform hover:scale-110 ${
                  swatch.toLowerCase() === hex.toLowerCase() ? 'ring-2 ring-violet-400' : ''
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={commitDraftInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDraftInput()
            }}
            className="mt-3 w-full rounded-lg bg-[#0c0c0e] px-2.5 py-1.5 font-mono text-xs text-zinc-200 ring-1 ring-zinc-800 outline-none focus:ring-violet-500/50"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  )
}
