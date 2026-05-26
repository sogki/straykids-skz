export const BANNER_VARIANT_PRESETS = {
  promo: {
    bg: 'linear-gradient(90deg, color-mix(in srgb, #5b21b6 90%, #1a1a1c), color-mix(in srgb, #7c3aed 85%, #141416))',
    border: 'rgba(167, 139, 250, 0.35)',
    color: '#f5f3ff',
  },
  info: {
    bg: 'linear-gradient(90deg, color-mix(in srgb, #0c4a6e 90%, #1a1a1c), color-mix(in srgb, #0369a1 85%, #141416))',
    border: 'rgba(56, 189, 248, 0.35)',
    color: '#e0f2fe',
  },
  alert: {
    bg: 'linear-gradient(90deg, color-mix(in srgb, #78350f 90%, #1a1a1c), color-mix(in srgb, #b45309 85%, #141416))',
    border: 'rgba(251, 191, 36, 0.35)',
    color: '#fffbeb',
  },
}

export function buildBannerSurfaceStyle({
  variant = 'promo',
  useCustomColors = false,
  bgColor = '#5b21b6',
  textColor = '#f5f3ff',
}) {
  if (useCustomColors) {
    return {
      background: `linear-gradient(90deg, color-mix(in srgb, ${bgColor} 90%, #1a1a1c), color-mix(in srgb, ${bgColor} 78%, #141416))`,
      borderBottomColor: `color-mix(in srgb, ${textColor} 35%, transparent)`,
      color: textColor,
    }
  }

  const preset = BANNER_VARIANT_PRESETS[variant] || BANNER_VARIANT_PRESETS.promo
  return {
    background: preset.bg,
    borderBottomColor: preset.border,
    color: preset.color,
  }
}

export function normalizeBannerSettings(settings = {}) {
  return {
    enabled: settings.site_banner_enabled === 'true',
    message: settings.site_banner_message ?? '',
    link: (settings.site_banner_link ?? '').trim(),
    variant: settings.site_banner_variant || 'promo',
    icon: settings.site_banner_icon ?? '',
    bgColor: settings.site_banner_bg_color || '#5b21b6',
    textColor: settings.site_banner_text_color || '#f5f3ff',
    useCustomColors: settings.site_banner_use_custom_colors === 'true',
    linkLabel: (settings.site_banner_link_label ?? '').trim(),
  }
}
