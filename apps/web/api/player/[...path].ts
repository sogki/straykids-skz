import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Proxy /api/player/* → Railway bot HTTP (player OAuth lives in @skz/bot, not a separate API app).
 * Set SKZ_BOT_HTTP_ORIGIN on Vercel, e.g. https://your-service.up.railway.app
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = process.env.SKZ_BOT_HTTP_ORIGIN?.replace(/\/$/, '')
  if (!origin) {
    res.status(500).json({
      error: 'SKZ_BOT_HTTP_ORIGIN is not set on Vercel.',
      hint: 'Add your Railway bot public URL (Settings → Networking → Public domain), then redeploy.',
    })
    return
  }

  const pathParts = req.query.path
  const subpath = Array.isArray(pathParts)
    ? pathParts.join('/')
    : typeof pathParts === 'string'
      ? pathParts
      : ''

  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v)
    } else if (value != null) {
      qs.append(key, String(value))
    }
  }
  const query = qs.toString()
  const target = `${origin}/api/player/${subpath}${query ? `?${query}` : ''}`

  try {
    const upstream = await fetch(target, {
      method: req.method ?? 'GET',
      headers: {
        cookie: req.headers.cookie ?? '',
        accept: req.headers.accept ?? '*/*',
      },
      redirect: 'manual',
    })

    res.status(upstream.status)

    const skipHeaders = new Set(['connection', 'content-encoding', 'transfer-encoding'])
    upstream.headers.forEach((value, key) => {
      if (!skipHeaders.has(key.toLowerCase())) {
        res.setHeader(key, value)
      }
    })

    const body = Buffer.from(await upstream.arrayBuffer())
    res.send(body)
  } catch (err) {
    console.error('[skz-web] bot proxy failed:', target, err)
    res.status(502).json({
      error: 'Could not reach the bot HTTP API on Railway.',
      hint: 'Ensure the bot is running, Railway has a public domain, and SKZ_BOT_HTTP_ORIGIN matches it.',
    })
  }
}
