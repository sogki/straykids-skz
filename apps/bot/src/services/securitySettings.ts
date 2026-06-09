import { getSupabase } from '../db/supabase.js'

export type ModerationAction = 'kick' | 'ban'

export type ContentFilterPattern = {
  id: string
  label: string
  /** Plain text — message is flagged if it contains this (case-insensitive). */
  text: string
  /** Legacy regex field — ignored when `text` is set. */
  pattern?: string
}

export interface SecuritySettings {
  guildId: string | null
  accountAgeGateEnabled: boolean
  accountAgeMinHours: number
  accountAgeAction: ModerationAction
  accountAgeLogChannelId: string | null
  contentFilterEnabled: boolean
  contentFilterAction: ModerationAction
  contentFilterLogChannelId: string | null
  contentFilterExemptChannelIds: string[]
  contentFilterPatterns: ContentFilterPattern[]
}

export const DEFAULT_CONTENT_FILTER_PATTERNS: ContentFilterPattern[] = [
  { id: 'child_porn', label: 'child porn', text: 'child porn' },
  { id: 'csam', label: 'csam', text: 'csam' },
  { id: 'cp', label: 'cp', text: 'cp' },
  { id: 'pedo', label: 'pedo', text: 'pedo' },
  { id: 'pedophile', label: 'pedophile', text: 'pedophile' },
  { id: 'pedophilia', label: 'pedophilia', text: 'pedophilia' },
  { id: 'rape', label: 'rape', text: 'rape' },
  { id: 'bestiality', label: 'bestiality', text: 'bestiality' },
  { id: 'zoophilia', label: 'zoophilia', text: 'zoophilia' },
  { id: 'necrophilia', label: 'necrophilia', text: 'necrophilia' },
  { id: 'loli', label: 'loli', text: 'loli' },
  { id: 'lolicon', label: 'lolicon', text: 'lolicon' },
  { id: 'shota', label: 'shota', text: 'shota' },
  { id: 'shotacon', label: 'shotacon', text: 'shotacon' },
]

const SECURITY_KEYS = [
  'guild_id',
  'account_age_gate_enabled',
  'account_age_min_hours',
  'account_age_action',
  'account_age_log_channel_id',
  'content_filter_enabled',
  'content_filter_action',
  'content_filter_log_channel_id',
  'content_filter_exempt_channel_ids',
  'content_filter_patterns',
] as const

function boolSetting(value: string | undefined, defaultValue: boolean) {
  const v = String(value ?? '').toLowerCase()
  if (v === 'true') return true
  if (v === 'false') return false
  return defaultValue
}

function emptyToNull(value: string | undefined): string | null {
  const t = String(value ?? '').trim()
  return t.length ? t : null
}

function parseAction(value: string | undefined, fallback: ModerationAction): ModerationAction {
  const v = String(value ?? '').toLowerCase()
  if (v === 'kick' || v === 'ban') return v
  return fallback
}

function parseMinHours(value: string | undefined): number {
  const n = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) return 24
  return Math.min(n, 24 * 365)
}

function parseChannelIdList(value: string | undefined): string[] {
  return String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parsePatterns(value: string | undefined): ContentFilterPattern[] {
  if (!value?.trim()) return DEFAULT_CONTENT_FILTER_PATTERNS
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_CONTENT_FILTER_PATTERNS
    const patterns: ContentFilterPattern[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const raw = row as Record<string, unknown>
      const id = String(raw.id ?? '').trim()
      const text = String(raw.text ?? raw.matchValue ?? raw.label ?? '').trim()
      const label = String(raw.label ?? text ?? id).trim()
      if (!id || !text) continue
      patterns.push({ id, label, text })
    }
    return patterns.length ? patterns : DEFAULT_CONTENT_FILTER_PATTERNS
  } catch {
    return DEFAULT_CONTENT_FILTER_PATTERNS
  }
}

let cached: SecuritySettings | null = null
let cachedAt = 0
const CACHE_MS = 30_000

export async function loadSecuritySettings(force = false): Promise<SecuritySettings> {
  if (!force && cached && Date.now() - cachedAt < CACHE_MS) {
    return cached
  }

  const db = getSupabase()
  const { data, error } = await db
    .from('skz_bot_settings')
    .select('key, value')
    .in('key', [...SECURITY_KEYS])

  if (error) throw new Error(`Security settings read failed: ${error.message}`)

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[String(row.key)] = String(row.value ?? '')

  cached = {
    guildId: emptyToNull(map['guild_id']),
    accountAgeGateEnabled: boolSetting(map['account_age_gate_enabled'], false),
    accountAgeMinHours: parseMinHours(map['account_age_min_hours']),
    accountAgeAction: parseAction(map['account_age_action'], 'kick'),
    accountAgeLogChannelId: emptyToNull(map['account_age_log_channel_id']),
    contentFilterEnabled: boolSetting(map['content_filter_enabled'], false),
    contentFilterAction: parseAction(map['content_filter_action'], 'ban'),
    contentFilterLogChannelId: emptyToNull(map['content_filter_log_channel_id']),
    contentFilterExemptChannelIds: parseChannelIdList(map['content_filter_exempt_channel_ids']),
    contentFilterPatterns: parsePatterns(map['content_filter_patterns']),
  }
  cachedAt = Date.now()
  return cached
}

export function invalidateSecuritySettingsCache() {
  cached = null
  cachedAt = 0
}

export function accountAgeMinMs(settings: SecuritySettings): number {
  return settings.accountAgeMinHours * 60 * 60 * 1000
}
