/**
 * Vercel serverless handlers — import @skz/api source via relative path so the
 * bundler includes it (workspace package exports can fail at runtime on Vercel).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { loadApiConfig } from '../../../api/src/config.js'
import { loadLocalEnv } from '../../../api/src/loadEnv.js'
import {
  handlePlayerDiscordAuthCallback,
  handlePlayerDiscordAuthStart,
  OAUTH_STATE_COOKIE,
  parseCookieHeader,
  playerAuthSetCookieHeaders,
  type PlayerAuthResult,
} from '../../../api/src/playerAuthHandlers.js'

loadLocalEnv()

const VERCEL_SETUP_HINT =
  'Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the Vercel project (Settings → Environment Variables), then redeploy. Same values as apps/bot/.env locally.'

function sendVercelPlayerAuthResult(res: VercelResponse, result: PlayerAuthResult) {
  if ('body' in result) {
    res.status(result.status).json(result.body)
    return
  }
  const cookies = playerAuthSetCookieHeaders(result)
  if (cookies.length) res.setHeader('Set-Cookie', cookies)
  res.redirect(result.status, result.location)
}

function sendConfigError(res: VercelResponse, err: unknown) {
  const message = err instanceof Error ? err.message : 'OAuth is not configured'
  console.error('[skz-api] oauth:', err)
  res.status(500).json({
    error: message,
    hint: message.includes('Supabase') || message.includes('discord_')
      ? VERCEL_SETUP_HINT
      : undefined,
  })
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
    sendConfigError(res, err)
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
