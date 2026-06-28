/**
 * Discord bot admin sidebar + URL section mapping.
 * Keep in sync with BotAdmin section keys and permission checks.
 */

export const BOT_SECTION_PATH = {
  hub: 'features',
  credentials: 'credentials',
  server: 'server',
  panels: 'panels',
  mod_config: 'mod-config',
  security: 'security',
  welcome_goodbye: 'welcome-goodbye',
  mod_logs: 'mod-logs',
  mod_notes: 'mod-notes',
  bot_health: 'health',
  permissions: 'permissions',
  logs: 'logs',
  qotd: 'qotd',
}

const PATH_TO_SECTION = Object.fromEntries(
  Object.entries(BOT_SECTION_PATH).map(([section, path]) => [path, section]),
)

/** @param {string} pathname e.g. /admin/bot/panels */
export function botSectionFromPathname(pathname) {
  const rest = String(pathname || '')
    .replace(/^\/admin\/bot\/?/, '')
    .split('/')
    .filter(Boolean)
  const segment = rest[0] || 'features'
  return PATH_TO_SECTION[segment] || 'hub'
}

/** @param {string} section BotAdmin section key */
export function botPathFromSection(section) {
  if (!section || section === 'hub') return '/admin/bot/features'
  const slug = BOT_SECTION_PATH[section]
  return slug ? `/admin/bot/${slug}` : '/admin/bot/features'
}

/**
 * @param {{ isFullAdmin: boolean, isRealFullAdmin: boolean, featureAccess: Record<string, boolean> }} access
 */
export function getBotNavItems({ isFullAdmin, isRealFullAdmin, featureAccess = {} }) {
  const canCredentials = isFullAdmin || Boolean(featureAccess.credentials)
  const canServer = isFullAdmin || Boolean(featureAccess.server)
  const canPanels = isFullAdmin || Boolean(featureAccess.panels)
  const canQotd = isFullAdmin || Boolean(featureAccess.qotd)
  const canModLogsConfig = isFullAdmin && featureAccess.mod_logs_config !== false
  const canWelcomeGoodbye = isFullAdmin && featureAccess.welcome_goodbye !== false
  const canModLogsView = isFullAdmin || Boolean(featureAccess.mod_logs_view)
  const canModNotes = isFullAdmin || Boolean(featureAccess.mod_notes)
  const canBotHealth = isFullAdmin
    ? featureAccess.bot_health !== false
    : Boolean(featureAccess.bot_health)
  const canSessionLogs = isFullAdmin && featureAccess.session_logs !== false
  const canRolePermissions = isFullAdmin && featureAccess.role_permissions !== false

  /** @type {{ section: string, path: string, label: string, icon: string }[]} */
  const items = [{ section: 'hub', path: '/admin/bot/features', label: 'Features', icon: 'layout-dashboard' }]

  if (canCredentials) {
    items.push({ section: 'credentials', path: botPathFromSection('credentials'), label: 'Credentials', icon: 'key-round' })
  }
  if (canServer) {
    items.push({ section: 'server', path: botPathFromSection('server'), label: 'Server', icon: 'server' })
  }
  if (canPanels) {
    items.push({ section: 'panels', path: botPathFromSection('panels'), label: 'Reaction panels', icon: 'layout-grid' })
  }
  if (isRealFullAdmin && canQotd) {
    items.push({ section: 'qotd', path: botPathFromSection('qotd'), label: 'Question of the day', icon: 'list-ordered' })
  }
  if (isRealFullAdmin && canModLogsConfig) {
    items.push({ section: 'mod_config', path: botPathFromSection('mod_config'), label: 'Moderation logging', icon: 'shield' })
    items.push({ section: 'security', path: botPathFromSection('security'), label: 'Server security', icon: 'shield-alert' })
  }
  if (isRealFullAdmin && canWelcomeGoodbye) {
    items.push({ section: 'welcome_goodbye', path: botPathFromSection('welcome_goodbye'), label: 'Welcome & goodbye', icon: 'user-plus' })
  }
  if (canBotHealth) {
    items.push({ section: 'bot_health', path: botPathFromSection('bot_health'), label: 'Bot health', icon: 'heart-pulse' })
  }
  if (canModLogsView) {
    items.push({ section: 'mod_logs', path: botPathFromSection('mod_logs'), label: 'Moderation logs', icon: 'scroll-text' })
  }
  if (canModNotes) {
    items.push({ section: 'mod_notes', path: botPathFromSection('mod_notes'), label: 'Mod notes', icon: 'clipboard-list' })
  }
  if (canRolePermissions) {
    items.push({ section: 'permissions', path: botPathFromSection('permissions'), label: 'Role permissions', icon: 'bot' })
  }
  if (canSessionLogs) {
    items.push({ section: 'logs', path: botPathFromSection('logs'), label: 'Session logs', icon: 'clock-3' })
  }

  return items
}

/** Split hub (Features) from nested child links for sidebar. */
export function splitBotNavItems(items = []) {
  if (!items.length) return { hub: null, children: [] }
  const [hub, ...children] = items
  return { hub, children }
}

export const BOT_NAV_PAGE_TITLES = {
  features: 'Features',
  credentials: 'Credentials',
  server: 'Server',
  panels: 'Reaction panels',
  qotd: 'Question of the day',
  'mod-config': 'Moderation logging',
  security: 'Server security',
  'welcome-goodbye': 'Welcome & goodbye',
  health: 'Bot health',
  'mod-logs': 'Moderation logs',
  'mod-notes': 'Mod notes',
  permissions: 'Role permissions',
  logs: 'Session logs',
}
