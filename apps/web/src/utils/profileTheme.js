import {
  BANNER_MODES,
  PROFILE_LAYOUTS,
  findImageBackground,
} from '@/data/profileAssets'
import {
  GRADIENT_PRESET_ID_ALIASES,
  findSkzGradientPreset,
} from '@/data/skzGradientPresets'

export const DEFAULT_PROFILE_THEME = {
  profileLayout: PROFILE_LAYOUTS.PORTRAIT,
  bannerMode: BANNER_MODES.GRADIENT,
  primaryColour: '#5865F2',
  accentColour: '#7289da',
  gradientAngle: 135,
  gradientPresetId: 'blurple',
  backgroundId: null,
  skzooId: null,
}

/** Merge stored profile with defaults (backward compatible). */
export function normalizeProfileTheme(stored) {
  const base = { ...DEFAULT_PROFILE_THEME }
  if (!stored) return base

  const primary =
    stored.primaryColour ?? stored.favouriteColour ?? base.primaryColour
  const accent = stored.accentColour ?? base.accentColour

  return {
    ...base,
    ...stored,
    primaryColour: primary,
    accentColour: accent,
    favouriteColour: primary,
    gradientAngle:
      typeof stored.gradientAngle === 'number'
        ? stored.gradientAngle
        : base.gradientAngle,
    profileLayout:
      stored.profileLayout === PROFILE_LAYOUTS.BANNER
        ? PROFILE_LAYOUTS.BANNER
        : PROFILE_LAYOUTS.PORTRAIT,
    bannerMode: stored.bannerMode ?? base.bannerMode,
    gradientPresetId:
      GRADIENT_PRESET_ID_ALIASES[stored.gradientPresetId] ??
      stored.gradientPresetId ??
      base.gradientPresetId,
    backgroundId: stored.backgroundId ?? null,
    skzooId: stored.skzooId ?? null,
  }
}

export function buildBannerStyle(profile) {
  const {
    bannerMode,
    primaryColour,
    accentColour,
    gradientAngle,
    backgroundId,
  } = normalizeProfileTheme(profile)

  const overlay = `linear-gradient(${gradientAngle}deg, color-mix(in srgb, ${primaryColour} 55%, transparent) 0%, color-mix(in srgb, ${accentColour} 40%, #121213) 100%)`

  if (bannerMode === BANNER_MODES.IMAGE) {
    const bg = findImageBackground(backgroundId)
    if (bg?.image) {
      return {
        backgroundImage: `${overlay}, url("${bg.image}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    }
  }

  return {
    background: `linear-gradient(${gradientAngle}deg, ${primaryColour} 0%, color-mix(in srgb, ${accentColour} 65%, #121213) 100%)`,
  }
}

/** Same two-stop gradient as album preset swatches in the builder. */
export function formatCardGradient(profile) {
  const { primaryColour, accentColour, gradientAngle } = normalizeProfileTheme(profile)
  return `linear-gradient(${gradientAngle}deg, ${primaryColour} 0%, ${accentColour} 100%)`
}

/** Solid gradient when no gallery photo is selected. */
export function buildCardFrameGradient(profile) {
  return { background: formatCardGradient(profile) }
}

/** Preset button swatch — identical gradient stops to the live card. */
export function buildPresetSwatchStyle(preset) {
  if (!preset) return undefined
  return {
    background: `linear-gradient(${preset.angle ?? 135}deg, ${preset.primary} 0%, ${preset.accent} 100%)`,
  }
}

/** Full-card gallery photo layer (behind colour overlay). */
export function buildCardPhotoBackdrop(profile, photoFit) {
  const { bannerMode, primaryColour, backgroundId } = normalizeProfileTheme(profile)

  if (bannerMode !== BANNER_MODES.IMAGE) return null

  const bg = findImageBackground(backgroundId)
  if (!bg?.image) return null

  return {
    backgroundImage: `url("${bg.image}")`,
    backgroundRepeat: 'no-repeat',
    backgroundColor: primaryColour,
    backgroundSize: photoFit?.backgroundSize ?? 'cover',
    backgroundPosition: photoFit?.backgroundPosition ?? 'center center',
  }
}

function parseHexColor(hex) {
  if (typeof hex !== 'string') return null
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return null
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  }
}

/** RGBA from a hex colour so the overlay keeps the exact hue the user picked. */
export function colorWithAlpha(hex, alpha) {
  const rgb = parseHexColor(hex)
  if (!rgb) return `color-mix(in srgb, ${hex} ${Math.round(alpha * 100)}%, transparent)`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/**
 * Photo overlay — same angle and hues as the solid gradient card, with soft alpha
 * so the gallery image stays visible where the gradient is light.
 */
export function buildCardColorOverlay(profile) {
  const { bannerMode, primaryColour, accentColour, gradientAngle } =
    normalizeProfileTheme(profile)

  if (bannerMode !== BANNER_MODES.IMAGE) return null

  const angle = gradientAngle
  const blend = colorWithAlpha(accentColour, 0.45)

  return {
    backgroundImage: `linear-gradient(
      ${angle}deg,
      ${colorWithAlpha(primaryColour, 0.04)} 0%,
      ${colorWithAlpha(primaryColour, 0.14)} 22%,
      ${colorWithAlpha(accentColour, 0.22)} 42%,
      ${colorWithAlpha(primaryColour, 0.48)} 62%,
      ${colorWithAlpha(primaryColour, 0.72)} 80%,
      ${colorWithAlpha(primaryColour, 0.88)} 92%,
      ${blend} 100%
    )`,
  }
}

export function applyGradientPreset(presetId) {
  const preset = findSkzGradientPreset(presetId)
  if (!preset) return null
  return {
    bannerMode: BANNER_MODES.GRADIENT,
    gradientPresetId: preset.id,
    primaryColour: preset.primary,
    accentColour: preset.accent,
    gradientAngle: preset.angle,
    backgroundId: null,
  }
}
