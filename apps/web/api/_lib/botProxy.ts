import type { VercelRequest, VercelResponse } from '@vercel/node'

export function getBotHttpOrigin(): string {
  return process.env.SKZ_BOT_HTTP_ORIGIN?.trim().replace(/\/$/, '') ?? ''
}

export async function proxyToBot(
  req: VercelRequest,
  res: VercelResponse,
  targetPath: string,
): Promise<void> {
  const origin = getBotHttpOrigin()
  if (!origin) {
    res.status(503).json({
      error: 'SKZ_BOT_HTTP_ORIGIN is not available on this deployment.',
      fix: 'Set it in Vercel → Environment Variables to your Railway public URL (https://….up.railway.app), then redeploy. Adding the variable alone does not update live functions.',
    })
    return
  }

  let originHost = ''
  try {
    originHost = new URL(origin).host
  } catch {
    res.status(503).json({
      error: 'SKZ_BOT_HTTP_ORIGIN is not a valid URL.',
      fix: 'Use https://your-service.up.railway.app with no trailing slash.',
    })
    return
  }

  if (/skzarcade\.com|vercel\.app/i.test(originHost)) {
    res.status(503).json({
      error: 'SKZ_BOT_HTTP_ORIGIN must be your Railway bot URL, not the Vercel site URL.',
      fix: 'Copy the public domain from Railway → your bot service → Settings → Networking.',
    })
    return
  }

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
  const target = `${origin}${targetPath}${query ? `?${query}` : ''}`

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
      error: 'Could not reach the bot on Railway.',
      botOriginHost: originHost,
      fix: 'Confirm the bot is deployed and running, Railway public networking is enabled, and SKZ_BOT_HTTP_ORIGIN matches that public URL exactly.',
    })
  }
}
