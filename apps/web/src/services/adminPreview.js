import { getStoredAdminAccess } from '@/services/skzAdmin'

const PREVIEW_KEY = 'skz_admin_preview_v1'
const PREVIEW_EVENT = 'skz-admin-preview-change'

/** Default bot feature flags per permission level (matches Supabase skz_admin_bot_features_for_user). */
export const BOT_FEATURE_DEFAULTS = {
  full_admin: {
    credentials: true,
    server: true,
    panels: true,
    qotd: true,
    session_logs: true,
    role_permissions: true,
    mod_logs_config: true,
    welcome_goodbye: true,
    mod_logs_view: true,
    mod_notes: true,
  },
  moderator: {
    credentials: false,
    server: false,
    panels: true,
    qotd: true,
    session_logs: false,
    role_permissions: false,
    mod_logs_config: false,
    mod_logs_view: false,
    welcome_goodbye: false,
    mod_notes: false,
  },
  member: {
    credentials: false,
    server: false,
    panels: false,
    qotd: false,
    session_logs: false,
    role_permissions: false,
    mod_logs_config: false,
    mod_logs_view: false,
    welcome_goodbye: false,
    mod_notes: false,
  },
}

export const BOT_FEATURE_LABELS = {
  credentials: 'Credentials',
  server: 'Server',
  panels: 'Panels',
  qotd: 'QOTD',
  session_logs: 'Session logs',
  role_permissions: 'Role permissions',
  mod_logs_config: 'Moderation logging (config)',
  welcome_goodbye: 'Welcome & goodbye',
  mod_logs_view: 'Moderation logs (view)',
  mod_notes: 'Mod notes',
}

export const PREVIEW_PRESETS = [
  {
    id: 'preset:moderator-default',
    label: 'Moderator (default features)',
    permission_level: 'moderator',
    bot_feature_access: {},
  },
  {
    id: 'preset:member',
    label: 'Member (no admin access)',
    permission_level: 'member',
    bot_feature_access: {},
  },
]

function sectionsForLevel(level) {
  if (level === 'full_admin') {
    return ['dashboard', 'banner', 'analytics', 'leaderboard', 'games', 'requests', 'bot']
  }
  if (level === 'moderator') return ['bot']
  return []
}

export function mergeBotFeatureAccess(permissionLevel, overrides = {}) {
  const level =
    permissionLevel === 'full_admin' || permissionLevel === 'moderator'
      ? permissionLevel
      : 'member'
  const base = { ...BOT_FEATURE_DEFAULTS[level] }
  for (const [key, raw] of Object.entries(overrides)) {
    if (!(key in base)) continue
    if (typeof raw === 'boolean') base[key] = raw
    else if (raw === 'true') base[key] = true
    else if (raw === 'false') base[key] = false
  }
  return base
}

export function getAdminPreview() {
  try {
    const raw = sessionStorage.getItem(PREVIEW_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setAdminPreview(preview) {
  if (!preview) {
    sessionStorage.removeItem(PREVIEW_KEY)
  } else {
    sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(preview))
  }
  window.dispatchEvent(new Event(PREVIEW_EVENT))
}

export function clearAdminPreview() {
  setAdminPreview(null)
}

export function subscribeAdminPreview(callback) {
  const handler = () => callback()
  window.addEventListener(PREVIEW_EVENT, handler)
  return () => window.removeEventListener(PREVIEW_EVENT, handler)
}

export function buildPreviewFromRolePermission(rolePerm) {
  const level = rolePerm.permission_level || 'member'
  const features = mergeBotFeatureAccess(level, rolePerm.bot_feature_access || {})
  return {
    active: true,
    presetId: null,
    roleId: rolePerm.discord_role_id,
    label: rolePerm.label || rolePerm.discord_role_id,
    permission_level: level,
    allowed_sections: sectionsForLevel(level),
    allowed_bot_features: features,
  }
}

export function buildPreviewFromPreset(preset) {
  const level = preset.permission_level || 'member'
  const features = mergeBotFeatureAccess(level, preset.bot_feature_access || {})
  return {
    active: true,
    presetId: preset.id,
    roleId: null,
    label: preset.label,
    permission_level: level,
    allowed_sections: sectionsForLevel(level),
    allowed_bot_features: features,
  }
}

/** Effective access for UI — only full admins can activate preview overlay. */
export function getEffectiveAdminAccess() {
  const real = getStoredAdminAccess()
  if (!real || real.permission_level !== 'full_admin') return real

  const preview = getAdminPreview()
  if (!preview?.active) return real

  return {
    ...real,
    permission_level: preview.permission_level,
    allowed_sections: preview.allowed_sections,
    allowed_bot_features: preview.allowed_bot_features,
    preview_mode: true,
    preview_label: preview.label,
    preview_role_id: preview.roleId,
    preview_preset_id: preview.presetId,
  }
}

export function isRealFullAdmin() {
  return getStoredAdminAccess()?.permission_level === 'full_admin'
}
