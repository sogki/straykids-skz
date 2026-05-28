import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import { bootstrap } from '../config.js'

/** Node 20 on Railway has no native WebSocket; Supabase Realtime needs this. */
function ensureNodeWebSocket() {
  if (typeof globalThis.WebSocket !== 'undefined') return
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket
}

let client: SupabaseClient | null = null
let currentUrl = ''
let currentKey = ''

export function getSupabase(): SupabaseClient {
  if (!client) {
    throw new Error(
      'Supabase client not initialised. Call initSupabase() first.',
    )
  }
  return client
}

/**
 * Create or recreate the service-role client. Called at startup and whenever
 * /reload picks up new supabase_url / supabase_service_role_key from the DB.
 */
export function initSupabase(url: string, serviceRoleKey: string): SupabaseClient {
  if (
    client &&
    url === currentUrl &&
    serviceRoleKey === currentKey
  ) {
    return client
  }

  ensureNodeWebSocket()
  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  currentUrl = url
  currentKey = serviceRoleKey
  return client
}

/**
 * First connection: bootstrap env → DB settings → error with instructions.
 */
export async function bootstrapSupabaseFromDb(): Promise<SupabaseClient> {
  // Try bootstrap env to reach the DB once.
  const url = bootstrap.supabaseUrl
  const key = bootstrap.supabaseServiceRoleKey

  if (!url || !key) {
    throw new Error(
      [
        'Cannot connect to Supabase: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in process env.',
        'On Railway (or any host without apps/bot/.env), add both variables in the service dashboard —',
        'the bot cannot read skz_bot_settings until it can connect once.',
        'After startup, credentials saved in Admin → Discord bot → Credentials (skz_bot_settings) are used on /reload.',
        'Also confirm rows exist in skz_bot_settings (not skz_settings) with non-empty values.',
      ].join(' '),
    )
  }

  initSupabase(url, key)

  const { data, error } = await getSupabase()
    .from('skz_bot_settings')
    .select('key, value')
    .in('key', ['supabase_url', 'supabase_service_role_key'])

  if (error) throw new Error(`Bootstrap settings read failed: ${error.message}`)

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    map[row.key as string] = String(row.value ?? '')
  }

  const dbUrl = map['supabase_url']?.trim()
  const dbKey = map['supabase_service_role_key']?.trim()

  if (dbUrl && dbKey) {
    initSupabase(dbUrl, dbKey)
  }

  return getSupabase()
}
