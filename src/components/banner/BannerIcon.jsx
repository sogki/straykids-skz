import {
  AlertCircle,
  Bell,
  Calendar,
  ExternalLink,
  Gamepad2,
  Gift,
  Heart,
  Info,
  Megaphone,
  Music2,
  PartyPopper,
  Rocket,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react'
import { sanitizeBannerIcon } from '@/data/bannerIcons'

const ICON_MAP = {
  Megaphone,
  Sparkles,
  Music2,
  Gamepad2,
  Trophy,
  Heart,
  Star,
  Zap,
  Bell,
  Calendar,
  Gift,
  PartyPopper,
  Rocket,
  Info,
  AlertCircle,
  ExternalLink,
}

export default function BannerIcon({ name, className, size = 16 }) {
  const safe = sanitizeBannerIcon(name)
  if (!safe) return null
  const Icon = ICON_MAP[safe]
  if (!Icon) return null
  return <Icon className={className} size={size} strokeWidth={2.25} aria-hidden="true" />
}
