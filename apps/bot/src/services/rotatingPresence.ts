import { ActivityType, PresenceUpdateStatus, type Client } from 'discord.js'

/**
 * Rotating rich presence (Playing / Watching / Listening).
 *
 * Bots may only set activity `name`, `state`, `type`, and `url` (not `application_id`).
 * Use discord.js `setPresence` so the gateway payload matches Discord’s bot rules.
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

function applyPresence(client: Client) {
  if (!client.user) return

  const entry = ROTATING_STATUSES[statusIndex % ROTATING_STATUSES.length]!
  statusIndex += 1

  try {
    client.user.setPresence({
      status: PresenceUpdateStatus.Online,
      activities: [
        {
          name: entry.name,
          type: entry.type,
        },
      ],
    })
    console.log(`[skz-bot] presence → ${activityLabel(entry.type, entry.name)}`)
  } catch (err) {
    console.warn('[skz-bot] presence update failed:', err)
  }
}

export function startRotatingPresence(client: Client) {
  if (rotateTimer) {
    clearInterval(rotateTimer)
    rotateTimer = null
  }
  applyPresence(client)
  rotateTimer = setInterval(() => {
    applyPresence(client)
  }, ROTATE_MS)
}

export function stopRotatingPresence() {
  if (rotateTimer) {
    clearInterval(rotateTimer)
    rotateTimer = null
  }
}
