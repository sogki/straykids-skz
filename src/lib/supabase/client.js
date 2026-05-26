import { createClient } from '@supabase/supabase-js'
import { resolveSupabaseCredentials } from './bootstrap'

let clientPromise = null

export function getSupabaseClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { url, anonKey } = await resolveSupabaseCredentials()
      return createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    })()
  }
  return clientPromise
}

export function resetSupabaseClient() {
  clientPromise = null
}
