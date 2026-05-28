import { getSupabaseClient } from '@/lib/supabase/client'

const PLAYER_SESSION_KEY = 'skz_player_web_session_v1'
const PLAYER_ACCESS_KEY = 'skz_player_access_v1'

export function discordAvatarUrl(discordUserId, avatarHash, size = 64) {
  if (avatarHash) {
    return `https://cdn.discordapp.com/avatars/${discordUserId}/${avatarHash}.png?size=${size}`
  }
  const index = Number(BigInt(discordUserId) % 6n)
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`
}

/** Start Discord OAuth (redirects to Discord authorize — no bot command). */
export async function startPlayerDiscordOAuth(returnPath = '/link') {
  const path = returnPath.startsWith('/') ? returnPath : '/link'
  const url = `/api/player/auth/discord?return_to=${encodeURIComponent(path)}`

  try {
    const health = await fetch('/api/player/health', { method: 'GET' })
    if (!health.ok) throw new Error('unavailable')
  } catch {
    const hint = import.meta.env.DEV
      ? 'Player sign-in runs on the Discord bot HTTP server. Run: npm run dev:bot (port 8787) or npm run dev:arcade from the repo root.'
      : 'Player sign-in is temporarily unavailable. Check the bot is running on Railway and SKZ_BOT_HTTP_ORIGIN is set on Vercel.'
    throw new Error(hint)
  }

  window.location.assign(url)
}

export function getStoredPlayerSession() {
  try {
    return localStorage.getItem(PLAYER_SESSION_KEY) || ''
  } catch {
    return ''
  }
}

export function setStoredPlayerSession(token) {
  localStorage.setItem(PLAYER_SESSION_KEY, token)
}

export function clearStoredPlayerSession() {
  localStorage.removeItem(PLAYER_SESSION_KEY)
  localStorage.removeItem(PLAYER_ACCESS_KEY)
}

export function getStoredPlayerAccess() {
  try {
    const raw = localStorage.getItem(PLAYER_ACCESS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredPlayerAccess(access) {
  localStorage.setItem(PLAYER_ACCESS_KEY, JSON.stringify(access))
}

/** Read session_token from OAuth callback hash and persist it. */
export function consumePlayerOAuthCallback() {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash?.replace(/^#/, '') ?? ''
  if (!hash) return null

  const params = new URLSearchParams(hash)
  const token = params.get('session_token')
  if (!token || !token.startsWith('p_')) return null

  setStoredPlayerSession(token)
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  )
  return token
}

const OAUTH_ERROR_MESSAGES = {
  cancelled: 'Discord sign-in was cancelled.',
  state_mismatch: 'Sign-in expired. Please try again.',
  invalid_callback: 'Invalid sign-in response. Please try again.',
  session_failed: 'Could not create your session. Try again later.',
  oauth_failed: 'Discord sign-in failed. Try again.',
}

export function playerOAuthErrorMessage(code) {
  if (!code) return null
  return OAUTH_ERROR_MESSAGES[code] ?? 'Discord sign-in failed. Please try again.'
}

export async function applyPlayerSessionToken(sessionToken) {
  const access = await validatePlayerSession(sessionToken)
  if (access) setStoredPlayerAccess(access)
  return access
}

export async function validatePlayerSession(sessionToken) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_player_validate_session', {
    p_session_token: sessionToken,
  })
  if (error) throw error
  return data
}

export async function fetchPlayerStats() {
  const token = getStoredPlayerSession()
  if (!token) return null
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_player_get_my_stats', {
    p_session_token: token,
  })
  if (error) throw error
  if (data) setStoredPlayerAccess(data)
  return data
}

export async function bootstrapPlayerSession() {
  const token = getStoredPlayerSession()
  if (!token) return { access: null }
  try {
    const access = await validatePlayerSession(token)
    if (!access) {
      clearStoredPlayerSession()
      return { access: null }
    }
    setStoredPlayerAccess(access)
    return { access }
  } catch {
    clearStoredPlayerSession()
    return { access: null }
  }
}

export async function signOutPlayer() {
  const token = getStoredPlayerSession()
  if (token) {
    try {
      const supabase = await getSupabaseClient()
      await supabase.rpc('skz_player_revoke_session', { p_session_token: token })
    } catch {
      // best effort
    }
  }
  clearStoredPlayerSession()
}
