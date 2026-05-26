import { getSupabaseClient } from '@/lib/supabase/client'

const ADMIN_SESSION_KEY = 'skz_admin_staff_session'

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
