/**
 * Supabase connection credentials.
 * Priority: 1) .env (VITE_*)  2) public/skz-connect.json  3) cached credentials from DB
 */

const PLACEHOLDER_MARKERS = ['YOUR_PROJECT', 'YOUR_SUPABASE', 'your_anon']

function isPlaceholder(value) {
  if (!value || typeof value !== 'string') return true
  return PLACEHOLDER_MARKERS.some((m) => value.includes(m))
}

/** From Vite .env — only variables prefixed with VITE_ are exposed to the browser */
export function getEnvCredentials() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

  if (isPlaceholder(url) || isPlaceholder(anonKey)) return null
  return { url, anonKey, source: 'env' }
}

export function getStorageBucketFromEnv() {
  return import.meta.env.VITE_STORAGE_BUCKET?.trim() || 'skz_arcade'
}
