import { getSupabase } from '../db/supabase.js'

const HEALTH_KEYS = new Set([
  'bot_started_at',
  'bot_heartbeat_at',
  'bot_ws_status',
  'bot_outbox_last_run_at',
  'bot_qotd_last_check_at',
  'bot_cache_synced_at',
])

async function upsertHealthSetting(key: string, value: string): Promise<void> {
  if (!HEALTH_KEYS.has(key)) return
  const db = getSupabase()
  const { error } = await db
    .from('skz_bot_settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) {
    console.warn(`[skz-bot] health setting ${key} upsert failed:`, error.message)
  }
}

function isoNow(): string {
  return new Date().toISOString()
}

export async function recordBotReady(): Promise<void> {
  const now = isoNow()
  await upsertHealthSetting('bot_started_at', now)
  await upsertHealthSetting('bot_heartbeat_at', now)
  await upsertHealthSetting('bot_ws_status', 'ready')
}

export async function recordHeartbeat(): Promise<void> {
  await upsertHealthSetting('bot_heartbeat_at', isoNow())
  await upsertHealthSetting('bot_ws_status', 'ready')
}

export async function recordBotOffline(): Promise<void> {
  await upsertHealthSetting('bot_ws_status', 'offline')
}

export async function recordOutboxRun(): Promise<void> {
  await upsertHealthSetting('bot_outbox_last_run_at', isoNow())
}

export async function recordQotdCheck(): Promise<void> {
  await upsertHealthSetting('bot_qotd_last_check_at', isoNow())
}

export async function recordCacheSync(): Promise<void> {
  await upsertHealthSetting('bot_cache_synced_at', isoNow())
}

const HEARTBEAT_MS = 45_000

let heartbeatTimer: ReturnType<typeof setInterval> | undefined

export function startHealthHeartbeat(): void {
  if (heartbeatTimer) return
  heartbeatTimer = setInterval(() => {
    recordHeartbeat().catch((err) =>
      console.warn('[skz-bot] heartbeat failed:', err),
    )
  }, HEARTBEAT_MS)
}

export function stopHealthHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = undefined
  }
}
