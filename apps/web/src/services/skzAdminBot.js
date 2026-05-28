import { getSupabaseClient } from '../lib/supabase/client'

const KNOWN_SETTING_KEYS = [
  'guild_id',
  'verify_channel_id',
  'verify_message_id',
  'verify_emoji',
  'verify_role_id',
  'join_to_create_channel_id',
  'join_to_create_category_id',
  'join_to_create_name_pattern',
]

const SETTING_DEFAULTS = {
  guild_id: '',
  verify_channel_id: '',
  verify_message_id: '',
  verify_emoji: '',
  verify_role_id: '',
  join_to_create_channel_id: '',
  join_to_create_category_id: '',
  join_to_create_name_pattern: "{username}'s vc",
}

function normaliseConfig(raw) {
  const settingsRaw = raw?.settings && typeof raw.settings === 'object' ? raw.settings : {}
  const settings = { ...SETTING_DEFAULTS }
  for (const key of KNOWN_SETTING_KEYS) {
    if (typeof settingsRaw[key] === 'string') {
      settings[key] = settingsRaw[key]
    }
  }
  const reactionRoles = Array.isArray(raw?.reaction_roles) ? raw.reaction_roles : []
  return { settings, reactionRoles }
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
  for (const key of KNOWN_SETTING_KEYS) {
    payload[key] = String(settings?.[key] ?? '')
  }
  const { data, error } = await supabase.rpc('skz_admin_bot_set_settings', {
    p_code: code.trim(),
    p_settings: payload,
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

export const REACTION_ROLE_CATEGORIES = [
  { value: 'verify', label: 'Verify' },
  { value: 'pronouns', label: 'Pronouns' },
  { value: 'colors', label: 'Colors' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
]

export { KNOWN_SETTING_KEYS }
