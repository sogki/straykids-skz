import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { createPlayerAuthRouter } from './playerAuthRouter.js'

/** HTTP API for player Discord OAuth (same process as the bot, reads skz_bot_settings). */
export function startPlayerAuthHttpServer() {
  const port = Number(process.env.PORT || process.env.BOT_HTTP_PORT || 8787)
  const app = express()

  app.use(cors({ origin: true, credentials: true }))
  app.use(cookieParser())

  // Railway / load balancers often probe `/` first.
  app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'skz-bot' })
  })

  app.get('/api/player/health', (_req, res) => {
    res.json({ ok: true, service: 'skz-player-auth', host: 'bot', port })
  })

  app.use('/api/player/auth', createPlayerAuthRouter())

  app.listen(port, '0.0.0.0', () => {
    console.log(`[skz-bot] player OAuth HTTP listening on 0.0.0.0:${port} (PORT=${process.env.PORT ?? 'unset'})`)
    console.log(`[skz-bot] health: /api/player/health`)
  })

  return app
}
