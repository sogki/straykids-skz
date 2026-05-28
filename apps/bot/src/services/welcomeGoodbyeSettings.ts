import { getSupabase } from '../db/supabase.js'
import type { ModLogEmbedShape } from './modLogSettings.js'
import { DEFAULT_WELCOME_GOODBYE_EMBEDS } from './welcomeGoodbyeDefaults.js'

const KEYS = [
  'guild_id',
  'welcome_enabled',
  'welcome_channel_id',
  'goodbye_enabled',
  'goodbye_channel_id',
  'welcome_embed',
  'goodbye_embed',
] as const

export interface WelcomeGoodbyeSettings {
  guildId: string | null
  welcomeEnabled: boolean
  welcomeChannelId: string | null
  goodbyeEnabled: boolean
  goodbyeChannelId: string | null
  welcomeEmbed: ModLogEmbedShape
  goodbyeEmbed: ModLogEmbedShape
}

function boolSetting(value: string | undefined, fallback: boolean) {
  if (value == null || value === '') return fallback
  return String(value).toLowerCase() === 'true'
}

function emptyToNull(value: string | undefined) {
  const v = String(value ?? '').trim()
  return v || null
}

function parseEmbedJson(value: string | undefined, fallback: ModLogEmbedShape): ModLogEmbedShape {
  if (!value?.trim()) return { ...fallback, fields: [...(fallback.fields || [])] }
  try {
    const parsed = JSON.parse(value) as ModLogEmbedShape
    return {
      ...fallback,
      ...parsed,
      fields: Array.isArray(parsed.fields) ? [...parsed.fields] : [...(fallback.fields || [])],
    }
  } catch {
    return { ...fallback, fields: [...(fallback.fields || [])] }
  }
}

let cached: WelcomeGoodbyeSettings | null = null
let cachedAt = 0
const CACHE_MS = 30_000

export async function loadWelcomeGoodbyeSettings(force = false): Promise<WelcomeGoodbyeSettings> {
  if (!force && cached && Date.now() - cachedAt < CACHE_MS) {
    return cached
  }

  const db = getSupabase()
  const { data, error } = await db.from('skz_bot_settings').select('key, value').in('key', [...KEYS])
  if (error) throw new Error(`Welcome/goodbye settings read failed: ${error.message}`)

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[String(row.key)] = String(row.value ?? '')

  cached = {
    guildId: emptyToNull(map['guild_id']),
    welcomeEnabled: boolSetting(map['welcome_enabled'], false),
    welcomeChannelId: emptyToNull(map['welcome_channel_id']),
    goodbyeEnabled: boolSetting(map['goodbye_enabled'], false),
    goodbyeChannelId: emptyToNull(map['goodbye_channel_id']),
    welcomeEmbed: parseEmbedJson(map['welcome_embed'], DEFAULT_WELCOME_GOODBYE_EMBEDS.welcome),
    goodbyeEmbed: parseEmbedJson(map['goodbye_embed'], DEFAULT_WELCOME_GOODBYE_EMBEDS.goodbye),
  }
  cachedAt = Date.now()
  return cached
}

export function invalidateWelcomeGoodbyeSettingsCache() {
  cached = null
  cachedAt = 0
}
