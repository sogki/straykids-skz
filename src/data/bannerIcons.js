/**
 * Curated Lucide icons for the site banner (must match lucide-react export names).
 */
export const BANNER_ICON_OPTIONS = [
  { name: '', label: 'None' },
  { name: 'Megaphone', label: 'Megaphone' },
  { name: 'Sparkles', label: 'Sparkles' },
  { name: 'Music2', label: 'Music' },
  { name: 'Gamepad2', label: 'Gamepad' },
  { name: 'Trophy', label: 'Trophy' },
  { name: 'Heart', label: 'Heart' },
  { name: 'Star', label: 'Star' },
  { name: 'Zap', label: 'Zap' },
  { name: 'Bell', label: 'Bell' },
  { name: 'Calendar', label: 'Calendar' },
  { name: 'Gift', label: 'Gift' },
  { name: 'PartyPopper', label: 'Party' },
  { name: 'Rocket', label: 'Rocket' },
  { name: 'Info', label: 'Info' },
  { name: 'AlertCircle', label: 'Alert' },
  { name: 'ExternalLink', label: 'External link' },
]

const ALLOWED = new Set(
  BANNER_ICON_OPTIONS.map((o) => o.name).filter(Boolean)
)

export function sanitizeBannerIcon(name) {
  if (!name || typeof name !== 'string') return ''
  return ALLOWED.has(name) ? name : ''
}
