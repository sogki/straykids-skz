/**
 * Resolve image paths from the skz_arcade Supabase Storage bucket.
 *
 * In skz_settings.hero_image_url or skz_games.image_url use either:
 * - Full URL: https://...
 * - Bucket path: hero/banner.jpg
 */
export function resolveSkzAssetUrl(urlOrPath, supabaseUrl, bucket = 'skz_arcade') {
  if (!urlOrPath) return null

  const trimmed = urlOrPath.trim()

  // Full URLs work even before supabaseUrl is loaded
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  if (!supabaseUrl) return null

  const base = supabaseUrl.replace(/\/$/, '')
  const path = trimmed.replace(/^\//, '')
  return `${base}/storage/v1/object/public/${bucket}/${path}`
}
