import { Router, type Request, type Response } from 'express'
import { loadApiConfig } from './config.js'
import {
  handlePlayerDiscordAuthCallback,
  handlePlayerDiscordAuthStart,
  OAUTH_STATE_COOKIE,
  playerAuthSetCookieHeaders,
} from './playerAuthHandlers.js'

function sendPlayerAuthResult(
  res: import('express').Response,
  result: import('./playerAuthHandlers.js').PlayerAuthResult,
) {
  if ('body' in result) {
    res.status(result.status).json(result.body)
    return
  }
  const cookies = playerAuthSetCookieHeaders(result)
  if (cookies.length) res.setHeader('Set-Cookie', cookies)
  res.redirect(result.status, result.location)
}

export function createPlayerAuthRouter() {
  const router = Router()

  router.get('/discord', async (req: Request, res: Response) => {
    try {
      const config = await loadApiConfig()
      const result = await handlePlayerDiscordAuthStart(config, req.query.return_to)
      sendPlayerAuthResult(res, result)
    } catch (err) {
      console.error('[skz-api] oauth start:', err)
      res.status(500).json({
        error: err instanceof Error ? err.message : 'OAuth is not configured',
      })
    }
  })

  router.get('/discord/callback', async (req: Request, res: Response) => {
    try {
      const config = await loadApiConfig()
      const result = await handlePlayerDiscordAuthCallback(config, {
        error: typeof req.query.error === 'string' ? req.query.error : null,
        code: typeof req.query.code === 'string' ? req.query.code : undefined,
        state: typeof req.query.state === 'string' ? req.query.state : undefined,
        stateCookie: req.cookies?.[OAUTH_STATE_COOKIE] ?? null,
      })
      sendPlayerAuthResult(res, result)
    } catch (err) {
      console.error('[skz-api] oauth callback:', err)
      try {
        const config = await loadApiConfig()
        sendPlayerAuthResult(
          res,
          await handlePlayerDiscordAuthCallback(config, { error: 'oauth_failed' }),
        )
      } catch {
        res.redirect(302, '/link?error=oauth_failed')
      }
    }
  })

  return router
}
