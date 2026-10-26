import type { VercelRequest, VercelResponse } from '@vercel/node'
import { respondClosed } from '../../_lib/closed.js'

/** GET /api/player/auth/discord — offline. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  respondClosed(req, res)
}
