import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { loadApiConfig } from './config.js'
import { loadLocalEnv } from './loadEnv.js'
import { createPlayerAuthRouter } from './playerAuthRouter.js'

loadLocalEnv()

const app = express()

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(cookieParser())

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'skz-api' })
})

app.get('/api/player/health', (_req, res) => {
  res.json({ ok: true, service: 'skz-player-auth' })
})

app.use('/api/player/auth', createPlayerAuthRouter())

async function main() {
  const config = await loadApiConfig()
  app.listen(config.port, () => {
    console.log(`[skz-api] listening on http://127.0.0.1:${config.port}`)
    console.log(`[skz-api] player OAuth redirect: ${config.redirectUri}`)
    console.log(`[skz-api] site origin: ${config.siteOrigin}`)
  })
}

main().catch((err) => {
  console.error('[skz-api] failed to start:', err)
  process.exit(1)
})
