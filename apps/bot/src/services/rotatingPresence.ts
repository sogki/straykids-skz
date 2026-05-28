import { ActivityType, type Client } from 'discord.js'
import { ActivityType as ApiActivityType, GatewayOpcodes } from 'discord-api-types/v10'

/**
 * Rotating rich presence (Playing / Watching / Listening).
 *
 * Discord’s member list only formats these types when `application_id` is set
 * (your app’s client ID). Without it, clients often show plain `name` text only.
 *
 * @see https://discord.com/developers/docs/events/gateway-events#activity-object
 */

const ROTATING_STATUSES: ReadonlyArray<{ name: string; type: ActivityType }> = [
  { name: 'skzarcade.com', type: ActivityType.Playing },
  { name: 'Question of the Day', type: ActivityType.Watching },
  { name: 'Stray Kids', type: ActivityType.Listening },
  { name: 'STAY community', type: ActivityType.Watching },
  { name: 'Would You Rather?', type: ActivityType.Playing },
  { name: 'Throwback Thursday', type: ActivityType.Watching },
]

const ROTATE_MS = 45_000

let rotateTimer: ReturnType<typeof setInterval> | null = null
let statusIndex = 0
let applicationId: string | null = null

function activityLabel(type: ActivityType, name: string) {
  switch (type) {
    case ActivityType.Watching:
      return `Watching ${name}`
    case ActivityType.Listening:
      return `Listening to ${name}`
    case ActivityType.Playing:
      return `Playing ${name}`
    default:
      return name
  }
}

export function setPresenceApplicationId(id: string) {
  const trimmed = id.trim()
  applicationId = trimmed.length > 0 ? trimmed : null
}

function resolveApplicationId(client: Client): string | null {
  if (applicationId) return applicationId
  const id = client.application?.id
  if (id) {
    applicationId = id
    return id
  }
  return null
}

function sendPresenceUpdate(
  client: Client,
  entry: { name: string; type: ActivityType },
  appId: string,
) {
  const activity: Record<string, string | number> = {
    name: entry.name,
    type: entry.type as ApiActivityType,
    application_id: appId,
  }

  const packet = {
    op: GatewayOpcodes.PresenceUpdate,
    d: {
      since: 0,
      afk: false,
      status: 'online',
      activities: [activity],
    },
  }

  // Do not call client.user.setPresence() here — discord.js drops application_id and
  // would overwrite this packet, leaving only plain `name` text in the member list.
  ;(client.ws as unknown as { broadcast: (data: typeof packet) => void }).broadcast(packet)
}

async function applyPresence(client: Client) {
  if (!client.user) return

  const appId = resolveApplicationId(client)
  if (!appId) {
    console.warn(
      '[skz-bot] presence skipped: discord_client_id missing in skz_bot_settings (required for Playing/Watching UI)',
    )
    return
  }

  const entry = ROTATING_STATUSES[statusIndex % ROTATING_STATUSES.length]!
  statusIndex += 1

  try {
    sendPresenceUpdate(client, entry, appId)
    console.log(`[skz-bot] presence → ${activityLabel(entry.type, entry.name)} (app ${appId})`)
  } catch (err) {
    console.warn('[skz-bot] presence update failed:', err)
  }
}

export function startRotatingPresence(client: Client, discordApplicationId?: string) {
  if (discordApplicationId) setPresenceApplicationId(discordApplicationId)

  if (rotateTimer) {
    clearInterval(rotateTimer)
    rotateTimer = null
  }
  void applyPresence(client)
  rotateTimer = setInterval(() => {
    void applyPresence(client)
  }, ROTATE_MS)
}

export function stopRotatingPresence() {
  if (rotateTimer) {
    clearInterval(rotateTimer)
    rotateTimer = null
  }
}
