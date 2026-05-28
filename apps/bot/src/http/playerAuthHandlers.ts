import { randomBytes } from 'node:crypto'
import type { PlayerAuthConfig } from './playerAuthConfig.js'
import {
  discordAuthorizeUrl,
  exchangeDiscordCode,
  fetchDiscordUser,
} from './discordOAuth.js'

export const OAUTH_STATE_COOKIE = 'skz_player_oauth_state'
const STATE_MAX_AGE_MS = 10 * 60 * 1000

export type CookieOptions = {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'lax' | 'strict' | 'none'
  maxAge?: number
  path?: string
}

export type PlayerAuthCookie = {
  name: string
  value: string
  options: CookieOptions
}

export type PlayerAuthRedirect = {
  status: number
  location: string
  setCookies?: PlayerAuthCookie[]
  clearCookies?: string[]
}

export type PlayerAuthJsonError = {
  status: number
  body: { error: string }
}

export type PlayerAuthResult = PlayerAuthRedirect | PlayerAuthJsonError

function randomState() {
  return randomBytes(24).toString('hex')
}

function errorRedirect(siteOrigin: string, message: string): PlayerAuthRedirect {
  const url = new URL('/profile', siteOrigin)
  url.searchParams.set('error', message)
  return { status: 302, location: url.toString() }
}

function oauthStateCookie(state: string, returnTo: string, secure: boolean): PlayerAuthCookie {
  return {
    name: OAUTH_STATE_COOKIE,
    value: `${state}:${returnTo}`,
    options: {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: STATE_MAX_AGE_MS,
      path: '/',
    },
  }
}

export async function handlePlayerDiscordAuthStart(
  config: PlayerAuthConfig,
  returnToRaw: unknown,
): Promise<PlayerAuthResult> {
  const returnTo =
    typeof returnToRaw === 'string' && returnToRaw.startsWith('/') ? returnToRaw : '/profile'

  const state = randomState()
  const authorizeUrl = discordAuthorizeUrl({
    clientId: config.discordClientId,
    redirectUri: config.redirectUri,
    state,
  })

  return {
    status: 302,
    location: authorizeUrl,
    setCookies: [
      oauthStateCookie(state, returnTo, config.siteOrigin.startsWith('https://')),
    ],
  }
}

export async function handlePlayerDiscordAuthCallback(
  config: PlayerAuthConfig,
  params: {
    error?: string | null
    code?: string
    state?: string
    stateCookie?: string | null
  },
): Promise<PlayerAuthResult> {
  const siteOrigin = config.siteOrigin
  const clearCookies = [OAUTH_STATE_COOKIE]

  if (params.error) {
    const code = params.error === 'access_denied' ? 'cancelled' : params.error
    return { ...errorRedirect(siteOrigin, code), clearCookies }
  }

  const code = params.code ?? ''
  const state = params.state ?? ''
  const cookieRaw = params.stateCookie

  if (!cookieRaw || !code || !state) {
    return { ...errorRedirect(siteOrigin, 'invalid_callback'), clearCookies }
  }

  const colon = String(cookieRaw).indexOf(':')
  const expectedState = colon >= 0 ? String(cookieRaw).slice(0, colon) : String(cookieRaw)
  const returnTo = colon >= 0 ? String(cookieRaw).slice(colon + 1) : '/profile'

  if (state !== expectedState) {
    return { ...errorRedirect(siteOrigin, 'state_mismatch'), clearCookies }
  }

  try {
    const accessToken = await exchangeDiscordCode({
      clientId: config.discordClientId,
      clientSecret: config.discordClientSecret,
      redirectUri: config.redirectUri,
      code,
    })

    const user = await fetchDiscordUser(accessToken)

    const { data: session, error: rpcError } = await config.supabase.rpc(
      'skz_player_create_session_from_discord',
      {
        p_discord_user_id: user.id,
        p_username: user.username,
        p_global_name: user.global_name,
        p_avatar_hash: user.avatar,
      },
    )

    if (rpcError || !session?.session_token) {
      console.error('[skz-bot] player session rpc:', rpcError)
      return { ...errorRedirect(siteOrigin, 'session_failed'), clearCookies }
    }

    const dest = new URL(returnTo.startsWith('/') ? returnTo : '/profile', siteOrigin)
    dest.hash = `session_token=${encodeURIComponent(session.session_token as string)}`

    return { status: 302, location: dest.toString(), clearCookies }
  } catch (err) {
    console.error('[skz-bot] player oauth callback:', err)
    return { ...errorRedirect(siteOrigin, 'oauth_failed'), clearCookies }
  }
}

export function serializeSetCookie(cookie: PlayerAuthCookie): string {
  const parts = [`${cookie.name}=${encodeURIComponent(cookie.value)}`]
  const o = cookie.options
  if (o.path) parts.push(`Path=${o.path}`)
  if (o.maxAge != null) parts.push(`Max-Age=${Math.floor(o.maxAge / 1000)}`)
  if (o.httpOnly) parts.push('HttpOnly')
  if (o.secure) parts.push('Secure')
  if (o.sameSite) parts.push(`SameSite=${o.sameSite}`)
  return parts.join('; ')
}

export function serializeClearCookie(name: string, path = '/'): string {
  return `${name}=; Path=${path}; Max-Age=0; HttpOnly`
}

export function playerAuthSetCookieHeaders(result: PlayerAuthRedirect): string[] {
  const cookies: string[] = []
  for (const c of result.setCookies ?? []) cookies.push(serializeSetCookie(c))
  for (const name of result.clearCookies ?? []) cookies.push(serializeClearCookie(name))
  return cookies
}
