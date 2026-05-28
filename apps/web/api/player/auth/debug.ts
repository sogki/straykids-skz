import type { VercelRequest, VercelResponse } from '@vercel/node'

/** GET /api/player/auth/debug — config smoke test (no secrets returned). */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const { loadApiConfig } = await import('@skz/api/config')
    const config = await loadApiConfig()
    res.status(200).json({
      ok: true,
      siteOrigin: config.siteOrigin,
      redirectUri: config.redirectUri,
      hasDiscordClientId: Boolean(config.discordClientId),
      hasDiscordClientSecret: Boolean(config.discordClientSecret),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'config failed'
    const hasUrl = Boolean(process.env.SUPABASE_URL?.trim())
    const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
    const hasTypoKey = Boolean(
      (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLEY_KEY?.trim(),
    )
    res.status(500).json({
      ok: false,
      error: message,
      env: {
        SUPABASE_URL: hasUrl,
        SUPABASE_SERVICE_ROLE_KEY: hasKey,
        SUPABASE_SERVICE_ROLEY_KEY: hasTypoKey,
      },
      hint: hasTypoKey
        ? 'Delete SUPABASE_SERVICE_ROLEY_KEY (typo) and add SUPABASE_SERVICE_ROLE_KEY instead.'
        : !hasUrl || !hasKey
          ? 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.'
          : undefined,
    })
  }
}
