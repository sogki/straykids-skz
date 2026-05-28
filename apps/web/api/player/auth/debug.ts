import type { VercelRequest, VercelResponse } from '@vercel/node'
import { proxyToBot } from '../../_lib/botProxy.js'

/** GET /api/player/auth/debug */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await proxyToBot(req, res, '/api/player/auth/debug')
}
