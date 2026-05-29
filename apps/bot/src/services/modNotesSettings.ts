import { getSupabase } from '../db/supabase.js'
import type { ModLogEmbedShape } from './modLogSettings.js'
import { DEFAULT_MOD_NOTES_VIEW_EMBED } from './modNotesDefaults.js'

const SETTING_KEY = 'mod_notes_view_embed'

let cachedEmbed: ModLogEmbedShape | null = null
let cachedAt = 0
const CACHE_MS = 30_000

function parseEmbedJson(raw: string | undefined): ModLogEmbedShape {
  if (!raw?.trim()) return { ...DEFAULT_MOD_NOTES_VIEW_EMBED }
  try {
    const parsed = JSON.parse(raw) as ModLogEmbedShape
    return { ...DEFAULT_MOD_NOTES_VIEW_EMBED, ...parsed }
  } catch {
    return { ...DEFAULT_MOD_NOTES_VIEW_EMBED }
  }
}

export async function loadModNotesViewEmbed(): Promise<ModLogEmbedShape> {
  if (cachedEmbed && Date.now() - cachedAt < CACHE_MS) {
    return cachedEmbed
  }
  const db = getSupabase()
  const { data, error } = await db
    .from('skz_bot_settings')
    .select('value')
    .eq('key', SETTING_KEY)
    .maybeSingle()
  if (error) {
    console.warn('[skz-bot] mod notes embed settings read failed:', error.message)
    cachedEmbed = { ...DEFAULT_MOD_NOTES_VIEW_EMBED }
  } else {
    cachedEmbed = parseEmbedJson(data?.value)
  }
  cachedAt = Date.now()
  return cachedEmbed
}

export function invalidateModNotesSettingsCache() {
  cachedEmbed = null
  cachedAt = 0
}
