import { discordAvatarUrl } from '@skz/shared'
import { getSupabaseClient } from '@/lib/supabase/client'

/** Discord slash command that issues one-time admin panel login codes. */
export const ADMIN_DISCORD_SLASH_COMMAND = 'panel'

const ADMIN_SESSION_KEY = 'skz_admin_staff_session'
const ADMIN_ACCESS_KEY = 'skz_admin_access_v1'
const ADMIN_WEB_SESSION_KEY = 'skz_admin_web_session_v1'

export function getStoredAdminCode() {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) || ''
  } catch {
    return ''
  }
}

export function setStoredAdminCode(code) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, code)
}

export function clearStoredAdminCode() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
}

export function getStoredAdminAccess() {
  try {
    const raw = sessionStorage.getItem(ADMIN_ACCESS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredAdminAccess(access) {
  sessionStorage.setItem(ADMIN_ACCESS_KEY, JSON.stringify(access))
}

export function clearStoredAdminAccess() {
  sessionStorage.removeItem(ADMIN_ACCESS_KEY)
}

export function getStoredAdminWebSession() {
  try {
    return sessionStorage.getItem(ADMIN_WEB_SESSION_KEY) || ''
  } catch {
    return ''
  }
}

export function setStoredAdminWebSession(token) {
  sessionStorage.setItem(ADMIN_WEB_SESSION_KEY, token)
}

export function clearStoredAdminWebSession() {
  sessionStorage.removeItem(ADMIN_WEB_SESSION_KEY)
}

export async function exchangeDiscordLoginCode(loginCode) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_exchange_discord_login', {
    p_login_code: String(loginCode || '').trim().toUpperCase(),
  })
  if (error) throw error
  if (data?.session_token) setStoredAdminWebSession(data.session_token)
  if (data) setStoredAdminAccess(data)
  return data
}

export async function validateAdminWebSession(sessionToken) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_validate_web_session', {
    p_session_token: sessionToken,
  })
  if (error) throw error
  return data || null
}

export async function bootstrapAdminSession() {
  const sessionToken = getStoredAdminWebSession()
  if (!sessionToken) {
    clearStoredAdminCode()
    clearStoredAdminAccess()
    return { session: null, access: null }
  }

  const access = await validateAdminWebSession(sessionToken)
  if (!access) {
    clearStoredAdminCode()
    clearStoredAdminAccess()
    clearStoredAdminWebSession()
    return { session: null, access: null }
  }

  setStoredAdminAccess(access)

  if (access?.permission_level === 'full_admin') {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase.rpc('skz_admin_get_staff_code_from_session', {
      p_session_token: sessionToken,
    })
    if (error) throw error
    if (data) setStoredAdminCode(String(data))
  } else {
    clearStoredAdminCode()
  }

  return { session: sessionToken, access }
}

export async function signOutAdminAuth() {
  const sessionToken = getStoredAdminWebSession()
  if (sessionToken) {
    try {
      const supabase = await getSupabaseClient()
      await supabase.rpc('skz_admin_revoke_web_session', {
        p_session_token: sessionToken,
      })
    } catch {
      // best effort revoke
    }
  }
  clearStoredAdminCode()
  clearStoredAdminAccess()
  clearStoredAdminWebSession()
}

export async function fetchAdminModLogs(limit = 100, eventType = null) {
  const sessionToken = getStoredAdminWebSession()
  if (!sessionToken) throw new Error('No admin session token')
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_list_mod_logs', {
    p_session_token: sessionToken,
    p_limit: limit,
    p_event_type: eventType || null,
  })
  if (error) throw error
  return Array.isArray(data) ? data : []
}

function normalizeGuildMember(row) {
  const extra =
    row?.extra && typeof row.extra === 'object' && !Array.isArray(row.extra) ? row.extra : {}
  const userId = String(row?.discord_user_id || row?.entity_id || '').trim()
  const loginName = String(
    row?.username || row?.login_username || extra.username || '',
  ).trim()
  const displayName = String(
    row?.display_name || extra.display_name || extra.global_name || row?.name || '',
  ).trim()
  const avatarHash =
    String(row?.avatar_hash || extra.avatar_hash || '').trim() || null
  return {
    discord_user_id: userId,
    username: loginName,
    display_name: displayName || loginName || userId,
    avatar_hash: avatarHash,
    avatar_url: discordAvatarUrl(userId, avatarHash, 128),
    note_count: Number(row?.note_count) || 0,
  }
}

export async function fetchAdminGuildMembers(query = '', { limit = 80, offset = 0 } = {}) {
  const sessionToken = getStoredAdminWebSession()
  if (!sessionToken) throw new Error('No admin session token')
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_search_guild_members', {
    p_session_token: sessionToken,
    p_query: query || '',
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error
  const payload =
    data && typeof data === 'object'
      ? data
      : { members: [], total: 0, limit, offset, query: query || '' }
  const members = Array.isArray(payload.members)
    ? payload.members.map(normalizeGuildMember)
    : []
  return { ...payload, members }
}

export async function fetchAdminModNoteSubjects() {
  const sessionToken = getStoredAdminWebSession()
  if (!sessionToken) throw new Error('No admin session token')
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_list_mod_note_subjects', {
    p_session_token: sessionToken,
  })
  if (error) throw error
  return Array.isArray(data) ? data : []
}

export async function fetchAdminModNotes(targetDiscordUserId, page = 1, perPage = 10) {
  const sessionToken = getStoredAdminWebSession()
  if (!sessionToken) throw new Error('No admin session token')
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_list_mod_notes', {
    p_session_token: sessionToken,
    p_target_discord_user_id: targetDiscordUserId,
    p_page: page,
    p_per_page: perPage,
  })
  if (error) throw error
  return data && typeof data === 'object' ? data : { notes: [], page: 1, total: 0, total_pages: 1 }
}

export async function createAdminModNote({
  targetDiscordUserId,
  body,
  targetUsername = '',
  targetDisplayName = '',
  targetAvatarUrl = '',
}) {
  const sessionToken = getStoredAdminWebSession()
  if (!sessionToken) throw new Error('No admin session token')
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_create_mod_note', {
    p_session_token: sessionToken,
    p_target_discord_user_id: targetDiscordUserId,
    p_body: body,
    p_target_username: targetUsername || '',
    p_target_display_name: targetDisplayName || '',
    p_target_avatar_url: targetAvatarUrl || '',
  })
  if (error) throw error
  return data
}

export async function deleteAdminModNote(noteId) {
  const sessionToken = getStoredAdminWebSession()
  if (!sessionToken) throw new Error('No admin session token')
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_delete_mod_note', {
    p_session_token: sessionToken,
    p_note_id: noteId,
  })
  if (error) throw error
  return Boolean(data)
}

export async function fetchAdminSessionLogs(limit = 200) {
  const sessionToken = getStoredAdminWebSession()
  if (!sessionToken) throw new Error('No admin session token')
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_list_web_sessions', {
    p_session_token: sessionToken,
    p_limit: limit,
  })
  if (error) throw error
  return Array.isArray(data) ? data : []
}

/** Live bot process metrics for the admin health dashboard (session + feature gated). */
export async function fetchAdminBotHealth() {
  const sessionToken = getStoredAdminWebSession()
  if (!sessionToken) throw new Error('No admin session token')
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_get_health', {
    p_session_token: sessionToken,
  })
  if (error) throw error
  return data || null
}

export async function verifyStaffCode(code) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_verify_staff_code', {
    p_code: code.trim(),
  })
  if (error) throw error
  return Boolean(data)
}

export async function fetchAdminAnalytics(code, days = 7) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_get_analytics', {
    p_code: code.trim(),
    p_days: days,
  })
  if (error) throw error
  return data
}

export async function fetchAdminBanner(code) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_get_banner', {
    p_code: code.trim(),
  })
  if (error) throw error
  return data
}

export async function fetchExcludedCountries(code) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_list_excluded_countries', {
    p_code: code.trim(),
  })
  if (error) throw error
  return data ?? []
}

export async function setCountryExcluded(code, countryCode, excluded, reason = '') {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_set_country_excluded', {
    p_code: code.trim(),
    p_country_code: countryCode.trim(),
    p_excluded: excluded,
    p_reason: reason || null,
  })
  if (error) throw error
  return data ?? []
}

export async function purgeCountryAnalytics(code, countryCode) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_purge_country_analytics', {
    p_code: code.trim(),
    p_country_code: countryCode.trim(),
  })
  if (error) throw error
  return data
}

export async function resetLeaderboard(code, gameSlug = null) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_reset_leaderboard', {
    p_code: code.trim(),
    p_game_slug: gameSlug || null,
  })
  if (error) throw error
  return data
}

export async function fetchSiteRequests(code, status = null, limit = 100) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_list_site_requests', {
    p_code: code.trim(),
    p_status: status || null,
    p_limit: limit,
  })
  if (error) throw error
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') return data
  return []
}

export async function updateSiteRequest(code, requestId, status, adminNotes = null) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_update_site_request', {
    p_code: code.trim(),
    p_request_id: requestId,
    p_status: status,
    p_admin_notes: adminNotes,
  })
  if (error) throw error
  return data
}

export async function fetchAdminGames(code) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_list_games', {
    p_code: code.trim(),
  })
  if (error) throw error
  return Array.isArray(data) ? data : []
}

export async function setGameActive(code, slug, active) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_set_game_active', {
    p_code: code.trim(),
    p_slug: slug,
    p_active: Boolean(active),
  })
  if (error) throw error
  return Array.isArray(data) ? data : []
}

export async function updateAdminBanner(
  code,
  {
    enabled,
    message,
    link,
    variant,
    icon,
    bgColor,
    textColor,
    useCustomColors,
    linkLabel,
  }
) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_update_banner', {
    p_code: code.trim(),
    p_enabled: enabled,
    p_message: message ?? '',
    p_link: link ?? '',
    p_variant: variant ?? 'promo',
    p_icon: icon ?? '',
    p_bg_color: bgColor ?? '#5b21b6',
    p_text_color: textColor ?? '#f5f3ff',
    p_use_custom_colors: Boolean(useCustomColors),
    p_link_label: linkLabel ?? '',
  })
  if (error) throw error
  return data
}
