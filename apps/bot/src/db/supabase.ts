import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { bootstrap } from '../config.js'

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
        'Cannot connect to Supabase.',
        'Either set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in apps/bot/.env as a one-time bootstrap,',
        'OR insert supabase_url and supabase_service_role_key into skz_bot_settings via the Supabase SQL editor.',
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
