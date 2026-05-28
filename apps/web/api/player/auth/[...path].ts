import type { VercelRequest, VercelResponse } from '@vercel/node'
import { proxyToBot } from '../../_lib/botProxy.js'

/** Proxy /api/player/auth/* → Railway bot (Discord OAuth). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathParts = req.query.path
  const subpath = Array.isArray(pathParts)
    ? pathParts.join('/')
    : typeof pathParts === 'string'
      ? pathParts
      : ''

  await proxyToBot(req, res, `/api/player/auth/${subpath}`)
}
