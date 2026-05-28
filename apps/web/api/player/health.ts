import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getBotHttpOrigin, proxyToBot } from '../_lib/botProxy.js'

/** GET /api/player/health — proxied to the bot, or config diagnostic if proxy cannot run. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = getBotHttpOrigin()
  if (!origin) {
    res.status(503).json({
      ok: false,
      service: 'skz-player-auth',
      error: 'SKZ_BOT_HTTP_ORIGIN not on this deployment',
      fix: 'Set SKZ_BOT_HTTP_ORIGIN in Vercel and redeploy.',
    })
    return
  }
  await proxyToBot(req, res, '/api/player/health')
}
