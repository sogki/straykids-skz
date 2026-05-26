/** Site-wide links, branding, and copy (not stored in DB). */
export const DISCORD_INVITE = 'https://discord.gg/dFhbmcHfcV'
export const DISCORD_LABEL = 'Seungminiverse'

/** Canonical public origin (Open Graph, share links, copy). */
export const SITE_ORIGIN = (
  import.meta.env.VITE_SITE_URL?.trim() || 'https://skzarcade.com'
).replace(/\/$/, '')

export const SITE_NAME = 'SKZ Arcade'

/** Build absolute URL for a path on skzarcade.com */
export function absoluteSiteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_ORIGIN}${normalized}`
}

/** Buy Me a Coffee — override with VITE_SUPPORT_URL if needed. */
export const SUPPORT_URL =
  import.meta.env.VITE_SUPPORT_URL?.trim() || 'https://buymeacoffee.com/sogki'

export const SUPPORT_LABEL = 'Support the project'

/** Bump when replacing logo files in Supabase so clients skip stale cache. */
export const SITE_LOGO_CACHE_BUST = '2'

/** SKZ Arcade logos (Supabase storage — skz_arcade bucket). */
export const SITE_LOGOS = {
  /** For dark backgrounds (navbar, footer, hero overlays). */
  white:
    'https://vwdrdqkzjkfdmycomfvf.supabase.co/storage/v1/object/public/skz_arcade/skz-arcade-logo.png',
  /** For light backgrounds. */
  black:
    'https://vwdrdqkzjkfdmycomfvf.supabase.co/storage/v1/object/public/skz_arcade/skz-arcade-logo-black.png',
}

/** Default social preview image (1200×630, generated — see scripts/generate-og-image.mjs) */
export const SITE_OG_IMAGE = absoluteSiteUrl('/og/skz-arcade.png')
