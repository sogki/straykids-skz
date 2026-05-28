import { getSupabaseClient } from '../lib/supabase/client'

export const SECRET_PLACEHOLDER = '__SECRET_SET__'

const OPERATIONAL_KEYS = [
  'guild_id',
  'verify_channel_id',
  'verify_message_id',
  'verify_emoji',
  'verify_role_id',
  'join_to_create_channel_id',
  'join_to_create_category_id',
  'join_to_create_name_pattern',
  'qotd_enabled',
  'qotd_channel_id',
  'qotd_post_hour_utc',
  'qotd_post_minute_utc',
  'qotd_thread_name_format',
]

const SECRET_KEYS = [
  'discord_token',
  'discord_client_id',
  'supabase_url',
  'supabase_service_role_key',
]

const ALL_SETTING_KEYS = [...SECRET_KEYS, ...OPERATIONAL_KEYS]

const SETTING_DEFAULTS = {
  discord_token: '',
  discord_client_id: '',
  supabase_url: '',
  supabase_service_role_key: '',
  guild_id: '',
  verify_channel_id: '',
  verify_message_id: '',
  verify_emoji: '',
  verify_role_id: '',
  join_to_create_channel_id: '',
  join_to_create_category_id: '',
  join_to_create_name_pattern: "{username}'s vc",
  qotd_enabled: 'false',
  qotd_channel_id: '',
  qotd_post_hour_utc: '12',
  qotd_post_minute_utc: '0',
  qotd_thread_name_format: 'QOTD • {date}',
}

export const EMPTY_EMBED = {
  title: '',
  description: '',
  color: 0x5865f2,
  url: '',
  author: { name: '', url: '', icon_url: '' },
  thumbnail: { url: '' },
  image: { url: '' },
  footer: { text: '', icon_url: '' },
  fields: [],
}

function normaliseConfig(raw) {
  const settingsRaw = raw?.settings && typeof raw.settings === 'object' ? raw.settings : {}
  const settings = { ...SETTING_DEFAULTS }
  for (const key of ALL_SETTING_KEYS) {
    if (typeof settingsRaw[key] === 'string') {
      settings[key] = settingsRaw[key]
    }
  }
  return {
    settings,
    reactionRoles: Array.isArray(raw?.reaction_roles) ? raw.reaction_roles : [],
    messages: Array.isArray(raw?.messages) ? raw.messages : [],
    discordCache: Array.isArray(raw?.discord_cache) ? raw.discord_cache : [],
    dailyQuestions: Array.isArray(raw?.daily_questions) ? raw.daily_questions : [],
    rolePermissions: Array.isArray(raw?.role_permissions) ? raw.role_permissions : [],
    userPermissions: Array.isArray(raw?.user_permissions) ? raw.user_permissions : [],
  }
}

export async function upsertUserPermission(code, { discord_user_id, label = '' }) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_upsert_user_permission', {
    p_code: code.trim(),
    p_discord_user_id: discord_user_id,
    p_label: label ?? '',
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function deleteUserPermission(code, discordUserId) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_delete_user_permission', {
    p_code: code.trim(),
    p_discord_user_id: discordUserId,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function fetchBotConfig(code) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_get_config', {
    p_code: code.trim(),
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function saveBotSettings(code, settings) {
  const supabase = await getSupabaseClient()
  const payload = {}
  for (const key of ALL_SETTING_KEYS) {
    const val = String(settings?.[key] ?? '').trim()
    payload[key] = val === SECRET_PLACEHOLDER ? SECRET_PLACEHOLDER : val
  }
  const { data, error } = await supabase.rpc('skz_admin_bot_set_settings', {
    p_code: code.trim(),
    p_settings: payload,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function listDiscordEntities(code, entityType = null) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_list_discord_entities', {
    p_code: code.trim(),
    p_entity_type: entityType,
  })
  if (error) throw error
  return Array.isArray(data) ? data : []
}

export async function queueBotAction(code, action, payload = {}) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_queue_action', {
    p_code: code.trim(),
    p_action: action,
    p_payload: payload,
  })
  if (error) throw error
  return data
}

export async function upsertBotMessage(code, input) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_upsert_message', {
    p_code: code.trim(),
    p_id: input.id ?? null,
    p_slug: input.slug,
    p_label: input.label ?? '',
    p_kind: input.kind ?? 'reaction_roles',
    p_channel_id: input.channel_id ?? '',
    p_embed: input.embed ?? EMPTY_EMBED,
    p_interaction_mode: input.interaction_mode ?? 'reaction',
    p_is_active: input.is_active !== false,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function deleteBotMessage(code, id) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_delete_message', {
    p_code: code.trim(),
    p_id: id,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function createReactionRole(code, input) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_create_reaction_role', {
    p_code: code.trim(),
    p_channel_id: String(input.channel_id ?? '').trim(),
    p_message_id: String(input.message_id ?? '').trim(),
    p_emoji: String(input.emoji ?? '').trim(),
    p_role_id: String(input.role_id ?? '').trim(),
    p_category: input.category || 'general',
    p_label: input.label || '',
    p_remove_on_unreact: input.remove_on_unreact !== false,
    p_bot_message_id: input.bot_message_id ?? null,
    p_button_style: input.button_style ?? null,
    p_button_emoji: input.button_emoji ?? '',
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function updateReactionRole(code, id, patch) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_update_reaction_role', {
    p_code: code.trim(),
    p_id: id,
    p_channel_id: patch.channel_id ?? null,
    p_message_id: patch.message_id ?? null,
    p_emoji: patch.emoji ?? null,
    p_role_id: patch.role_id ?? null,
    p_category: patch.category ?? null,
    p_label: patch.label ?? null,
    p_remove_on_unreact:
      typeof patch.remove_on_unreact === 'boolean' ? patch.remove_on_unreact : null,
    p_is_active: typeof patch.is_active === 'boolean' ? patch.is_active : null,
    p_bot_message_id: patch.bot_message_id ?? null,
    p_button_style: patch.button_style ?? null,
    p_button_emoji: patch.button_emoji ?? null,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function deleteReactionRole(code, id) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_delete_reaction_role', {
    p_code: code.trim(),
    p_id: id,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export const QOTD_QUESTION_TYPES = [
  { value: 'standard', label: 'Question of the day' },
  { value: 'would_you_rather', label: 'Would you rather' },
  { value: 'throwback_thursday', label: 'Throwback Thursday' },
]

/** UTC weekday 0=Sunday … 6=Saturday (matches bot getUTCDay()). */
export const QOTD_WEEKDAYS_UTC = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

export const QOTD_BONUS_POST_DAY_SETTINGS = {
  would_you_rather: 'qotd_bonus_would_you_rather_post_day_utc',
  throwback_thursday: 'qotd_bonus_throwback_thursday_post_day_utc',
}

export const QOTD_BONUS_SCHEDULE_SETTINGS = {
  would_you_rather: {
    day: 'qotd_bonus_would_you_rather_post_day_utc',
    hour: 'qotd_bonus_would_you_rather_post_hour_utc',
    minute: 'qotd_bonus_would_you_rather_post_minute_utc',
    defaultDay: '2',
    defaultHour: '18',
    defaultMinute: '0',
  },
  throwback_thursday: {
    day: 'qotd_bonus_throwback_thursday_post_day_utc',
    hour: 'qotd_bonus_throwback_thursday_post_hour_utc',
    minute: 'qotd_bonus_throwback_thursday_post_minute_utc',
    defaultDay: '4',
    defaultHour: '18',
    defaultMinute: '30',
  },
}

export function formatQotdUtcTimeFromDraft(draft, hourKey, minuteKey, fallbackHour = 12, fallbackMinute = 0) {
  const hour = Number.parseInt(String(draft?.[hourKey] ?? fallbackHour), 10)
  const minute = Number.parseInt(String(draft?.[minuteKey] ?? fallbackMinute), 10)
  const safeHour = Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : fallbackHour
  const safeMinute = Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : fallbackMinute
  return `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`
}

export function localTimePreviewFromUtc(utcTimeValue) {
  const [h, m] = String(utcTimeValue || '').split(':').map((part) => Number.parseInt(part, 10))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return ''
  const dt = new Date()
  dt.setUTCHours(h, m, 0, 0)
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function qotdWeekdayLabel(value) {
  return QOTD_WEEKDAYS_UTC.find((d) => d.value === String(value))?.label ?? '—'
}

export function normalizeQotdQuestionType(value) {
  const v = String(value || '').toLowerCase().trim()
  if (v === 'would_you_rather' || v === 'wyr') return 'would_you_rather'
  if (v === 'throwback_thursday' || v === 'throwback' || v === 'tbt') return 'throwback_thursday'
  return 'standard'
}

export function qotdTypeLabel(value) {
  return QOTD_QUESTION_TYPES.find((t) => t.value === value)?.label ?? 'Question of the day'
}

/** Parse bulk line: optional [wyr] or [throwback] prefix, else standard. */
export function parseBulkQotdLine(line) {
  const trimmed = String(line || '').trim()
  if (!trimmed) return null
  const match = trimmed.match(/^\[(wyr|would_you_rather|throwback|throwback_thursday|tbt|standard)\]\s*(.+)$/i)
  if (match) {
    return {
      question_type: normalizeQotdQuestionType(match[1]),
      prompt: match[2].trim(),
    }
  }
  return { question_type: 'standard', prompt: trimmed }
}

export async function createDailyQuestion(code, prompt, isActive = true, questionType = 'standard') {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_create_daily_question', {
    p_code: code.trim(),
    p_prompt: prompt,
    p_is_active: Boolean(isActive),
    p_question_type: normalizeQotdQuestionType(questionType),
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function updateDailyQuestion(code, id, patch) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_update_daily_question', {
    p_code: code.trim(),
    p_id: id,
    p_prompt: patch.prompt ?? null,
    p_is_active: typeof patch.is_active === 'boolean' ? patch.is_active : null,
    p_sort_order: Number.isFinite(patch.sort_order) ? patch.sort_order : null,
    p_question_type: patch.question_type ? normalizeQotdQuestionType(patch.question_type) : null,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function deleteDailyQuestion(code, id) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_delete_daily_question', {
    p_code: code.trim(),
    p_id: id,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function upsertRolePermission(
  code,
  { discord_role_id, permission_level, label, is_active = true, bot_feature_access = {} },
) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_upsert_role_permission', {
    p_code: code.trim(),
    p_discord_role_id: discord_role_id,
    p_permission_level: permission_level,
    p_label: label ?? '',
    p_is_active: Boolean(is_active),
    p_bot_feature_access: bot_feature_access ?? {},
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function deleteRolePermission(code, discordRoleId) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_delete_role_permission', {
    p_code: code.trim(),
    p_discord_role_id: discordRoleId,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export const REACTION_ROLE_CATEGORIES = [
  { value: 'verify', label: 'Verify' },
  { value: 'pronouns', label: 'Pronouns' },
  { value: 'colors', label: 'Colors' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
]

export const BUTTON_STYLES = [
  { value: 'primary', label: 'Primary (blurple)' },
  { value: 'secondary', label: 'Secondary (grey)' },
  { value: 'success', label: 'Success (green)' },
  { value: 'danger', label: 'Danger (red)' },
]

export const INTERACTION_MODES = [
  { value: 'reaction', label: 'Reactions only' },
  { value: 'button', label: 'Buttons only' },
  { value: 'both', label: 'Reactions + buttons' },
]

export const MESSAGE_KINDS = [
  { value: 'verify', label: 'Verify panel' },
  { value: 'reaction_roles', label: 'Reaction roles panel' },
  { value: 'general', label: 'General embed' },
]

export function hexColorToInt(hex) {
  const clean = String(hex || '').replace('#', '')
  const n = parseInt(clean, 16)
  return Number.isFinite(n) ? n : 0x5865f2
}

export function intColorToHex(n) {
  return `#${(Number(n) >>> 0).toString(16).padStart(6, '0').slice(-6)}`
}

export function channelsFromCache(cache, kind = null) {
  return cache.filter((e) => {
    if (e.entity_type !== 'channel') return false
    if (!kind) return true
    const k = e.channel_type === 2 || e.channel_type === 13 ? 'voice' : 'text'
    return k === kind
  })
}

export function rolesFromCache(cache) {
  return cache.filter((e) => e.entity_type === 'role')
}
