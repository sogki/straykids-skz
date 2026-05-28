import type { VercelRequest, VercelResponse } from '@vercel/node'
import { loadApiConfig } from './config.js'
import {
  handlePlayerDiscordAuthCallback,
  handlePlayerDiscordAuthStart,
  OAUTH_STATE_COOKIE,
  parseCookieHeader,
  playerAuthSetCookieHeaders,
  type PlayerAuthResult,
} from './playerAuthHandlers.js'

function sendVercelPlayerAuthResult(res: VercelResponse, result: PlayerAuthResult) {
  if ('body' in result) {
    res.status(result.status).json(result.body)
    return
  }
  const cookies = playerAuthSetCookieHeaders(result)
  if (cookies.length) res.setHeader('Set-Cookie', cookies)
  res.redirect(result.status, result.location)
}

export async function vercelPlayerDiscordAuth(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const config = await loadApiConfig()
    const returnTo = req.query.return_to
    const result = await handlePlayerDiscordAuthStart(config, returnTo)
    sendVercelPlayerAuthResult(res, result)
  } catch (err) {
    console.error('[skz-api] oauth start:', err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'OAuth is not configured',
    })
  }
}

export async function vercelPlayerDiscordCallback(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const config = await loadApiConfig()
    const cookies = parseCookieHeader(req.headers.cookie)
    const result = await handlePlayerDiscordAuthCallback(config, {
      error: typeof req.query.error === 'string' ? req.query.error : null,
      code: typeof req.query.code === 'string' ? req.query.code : undefined,
      state: typeof req.query.state === 'string' ? req.query.state : undefined,
      stateCookie: cookies[OAUTH_STATE_COOKIE] ?? null,
    })
    sendVercelPlayerAuthResult(res, result)
  } catch (err) {
    console.error('[skz-api] oauth callback:', err)
    try {
      const config = await loadApiConfig()
      sendVercelPlayerAuthResult(
        res,
        await handlePlayerDiscordAuthCallback(config, { error: 'oauth_failed' }),
      )
    } catch {
      res.redirect(302, '/link?error=oauth_failed')
    }
  }
}
