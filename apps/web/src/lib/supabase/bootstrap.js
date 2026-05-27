import { getEnvCredentials } from './credentials'

const CREDENTIALS_CACHE_KEY = 'skz_credentials_v2'

export async function loadConnectFile() {
  const res = await fetch(`${import.meta.env.BASE_URL}skz-connect.json`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  if (
    !data?.supabaseUrl ||
    data.supabaseUrl.includes('YOUR_PROJECT') ||
    data.bootstrapAnonKey?.includes('YOUR_SUPABASE')
  ) {
    return null
  }
  return {
    url: data.supabaseUrl,
    anonKey: data.bootstrapAnonKey,
    source: 'skz-connect.json',
  }
}

export function getCachedCredentials() {
  try {
    const raw = localStorage.getItem(CREDENTIALS_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function cacheCredentials(credentials) {
  localStorage.setItem(CREDENTIALS_CACHE_KEY, JSON.stringify(credentials))
}

export function clearLegacyConfigCache() {
  localStorage.removeItem('skz_public_config_v1')
}

export async function fetchPublicConfigRpc(supabaseUrl, anonKey) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/skz_get_public_config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: '{}',
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`skz_get_public_config failed: ${err}`)
  }

  return res.json()
}

/**
 * Resolve Supabase URL + anon key.
 * 1) .env (recommended)  2) skz-connect.json  3) cached DB values
 */
export async function resolveSupabaseCredentials() {
  clearLegacyConfigCache()

  let url
  let anonKey
  let source = 'unknown'

  const env = getEnvCredentials()
  if (env) {
    url = env.url
    anonKey = env.anonKey
    source = env.source
  } else {
    const file = await loadConnectFile()
    if (file) {
      url = file.url
      anonKey = file.anonKey
      source = file.source
    } else {
      const cached = getCachedCredentials()
      if (cached?.supabase_url && cached?.supabase_anon_key) {
        url = cached.supabase_url
        anonKey = cached.supabase_anon_key
        source = 'cache'
      }
    }
  }

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase credentials. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart npm run dev.'
    )
  }

  try {
    const fromDb = await fetchPublicConfigRpc(url, anonKey)
    if (fromDb?.supabase_url) url = fromDb.supabase_url
    if (fromDb?.supabase_anon_key) anonKey = fromDb.supabase_anon_key
    cacheCredentials({ supabase_url: url, supabase_anon_key: anonKey })
  } catch {
    /* DB may not have URL keys yet — .env credentials are enough */
  }

  return { url, anonKey, source }
}
