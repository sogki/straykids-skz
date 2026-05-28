const DISCORD_API = 'https://discord.com/api'

export interface DiscordUser {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
}

export function discordAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  state: string
}) {
  const url = new URL(`${DISCORD_API}/oauth2/authorize`)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'identify')
  url.searchParams.set('state', params.state)
  return url.toString()
}

export async function exchangeDiscordCode(params: {
  clientId: string
  clientSecret: string
  redirectUri: string
  code: string
}): Promise<string> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
  })

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Discord token exchange failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) throw new Error('Discord token response missing access_token')
  return json.access_token
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Discord user fetch failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<DiscordUser>
}
