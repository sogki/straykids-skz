import type { VercelRequest, VercelResponse } from '@vercel/node'

/** SKZ Arcade is permanently offline — all API routes return 410 Gone. */
export function respondClosed(_req: VercelRequest, res: VercelResponse): void {
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(410).json({
    ok: false,
    closed: true,
    error: 'SKZ Arcade is permanently offline. APIs are disabled.',
    site: 'https://skzarcade.com',
  })
}
