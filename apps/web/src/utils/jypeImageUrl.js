/** JYP Stray Kids CDN — gallery/discography images. */
export const JYPE_CDN_ORIGIN = 'https://d1al7qj7ydfbpt.cloudfront.net'

/**
 * Same-origin proxy path so images load without CDN CORS blocks.
 * Dev/preview: Vite proxy. Production: vercel.json / public/_redirects.
 */
export function resolveJypeImageUrl(url) {
  if (typeof url !== 'string' || !url) return url
  if (url.startsWith('/api/jype-image/')) return url
  if (url.startsWith(JYPE_CDN_ORIGIN)) {
    return `/api/jype-image${url.slice(JYPE_CDN_ORIGIN.length)}`
  }
  return url
}
