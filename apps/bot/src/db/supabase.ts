import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config.js'

/**
 * Service-role Supabase client. The bot runs server-side so the service
 * role key is safe here. NEVER ship this key into a browser bundle.
 */
export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)
