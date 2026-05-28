import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Clock3,
  KeyRound,
  LayoutGrid,
  ListOrdered,
  Loader2,
  Plus,
  RefreshCw,
  ScrollText,
  Server,
  Shield,
} from 'lucide-react'
import AdminSwitch from '@/components/admin/AdminSwitch'
import BotMessageEditor from '@/components/admin/BotMessageEditor'
import ModLogEmbedEditor from '@/components/admin/ModLogEmbedEditor'
import ModLogsViewer from '@/components/admin/ModLogsViewer'
import PanelTemplatePicker from '@/components/admin/PanelTemplatePicker'
import DiscordEntitySelect from '@/components/admin/DiscordEntitySelect'
import {
  channelNameMapFromDiscordCache,
  channelsFromCache,
  createDailyQuestion,
  createReactionRole,
  parseBulkQotdLine,
  formatQotdUtcTimeFromDraft,
  localTimePreviewFromUtc,
  QOTD_BONUS_SCHEDULE_SETTINGS,
  QOTD_QUESTION_TYPES,
  QOTD_WEEKDAYS_UTC,
  qotdWeekdayLabel,
  deleteDailyQuestion,
  deleteBotMessage,
  deleteReactionRole,
  deleteRolePermission,
  deleteUserPermission,
  fetchBotConfig,
  MOD_LOG_EMBED_TEMPLATES,
  MOD_LOG_EVENT_TYPES,
  DEFAULT_MOD_LOG_EMBEDS,
  modLogEmbedsEqual,
  modLogEmbedsToSettingsPayload,
  parseModLogEmbedsFromSettings,
  queueBotAction,
  saveBotSettings,
  SECRET_PLACEHOLDER,
  SETTING_DEFAULTS,
  upsertRolePermission,
  upsertUserPermission,
  updateReactionRole,
  updateDailyQuestion,
  upsertBotMessage,
} from '@/services/skzAdminBot'
import {
  fetchAdminModLogs,
  fetchAdminSessionLogs,
  getStoredAdminAccess,
  getStoredAdminCode,
} from '@/services/skzAdmin'

const MIGRATION_HINT =
  'Run migrations 20260528000001 through 20260528000023 in Supabase, then Refresh.'

const UI_INPUT =
  'h-10 w-full rounded-xl border border-zinc-700/80 bg-[#0d0d11] px-3 text-sm text-zinc-100 outline-none transition focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/20'
const UI_TEXTAREA =
  'w-full rounded-xl border border-zinc-700/80 bg-[#0d0d11] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/20'
const UI_SELECT = UI_INPUT
const UI_BUTTON_SECONDARY =
  'inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-[#16161c] px-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-[#1c1c24] disabled:opacity-40'
const UI_BUTTON_PRIMARY =
  'inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-500 px-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-40'

function isMigrationError(message) {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes('skz_admin_bot_') || m.includes('skz_bot_')
}

/** @typedef {'hub' | 'credentials' | 'server' | 'panels' | 'logs' | 'permissions' | 'mod_config' | 'mod_logs'} BotSection */

function BotBreadcrumb({ items }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap items-center gap-1 text-sm"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={item.key} className="inline-flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="size-3.5 shrink-0 text-zinc-600" aria-hidden />
            )}
            {isLast || !item.onClick ? (
              <span
                className={
                  isLast
                    ? 'font-medium text-zinc-200'
                    : 'text-zinc-500'
                }
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="rounded px-0.5 text-zinc-400 transition-colors hover:text-zinc-100"
              >
                {item.label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}

function HubCard({ icon: Icon, iconBg, title, description, tag, tagColor, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-4 rounded-xl border border-zinc-800/80 bg-[#18181b] p-4 text-left transition-all hover:border-zinc-700 hover:bg-[#1c1c20]"
    >
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-semibold text-zinc-100">{title}</span>
          <ChevronRight className="size-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
        </span>
        <span className="mt-1 block text-sm leading-snug text-zinc-500">{description}</span>
        {tag ? (
          <span
            className={`mt-3 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tagColor}`}
          >
            {tag}
          </span>
        ) : null}
      </span>
    </button>
  )
}

function SectionShell({ children }) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#15151a] to-[#111115] p-6 shadow-[0_6px_24px_rgba(0,0,0,0.25)] sm:p-8">
      {children}
    </div>
  )
}

function SubCard({ title, description, actions = null, children }) {
  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-gradient-to-b from-[#15151b] to-[#101016] p-5 shadow-[0_4px_18px_rgba(0,0,0,0.22)]">
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-zinc-800/70 pb-4">
        <div>
          <h4 className="text-base font-semibold text-zinc-100">{title}</h4>
          {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}

function AdminDataTable({ columns, rows, emptyMessage, loading }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/90 bg-[#111116]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#1a1a21] text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80 bg-[#121218]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-zinc-500">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 align-top text-zinc-300">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BotAdmin() {
  const access = getStoredAdminAccess()
  const isFullAdmin = access?.permission_level === 'full_admin'
  const featureAccess = access?.allowed_bot_features ?? {}
  const code = getStoredAdminCode()
  const hasStaffCode = Boolean(code?.trim())
  const moderatorOnly =
    !hasStaffCode && access?.permission_level === 'moderator'
  const [config, setConfig] = useState({
    settings: null,
    reactionRoles: [],
    messages: [],
    discordCache: [],
    dailyQuestions: [],
  })
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showHint, setShowHint] = useState(false)
  /** @type {[BotSection, function(BotSection): void]} */
  const [section, setSection] = useState('hub')
  const [serverSubsection, setServerSubsection] = useState('hub')
  const [qotdSubsection, setQotdSubsection] = useState('hub')
  const [editingPanel, setEditingPanel] = useState(null) // null | 'new' | message object
  const [pendingTemplate, setPendingTemplate] = useState(null)
  const [sessionLogs, setSessionLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [expandedRolePermissionId, setExpandedRolePermissionId] = useState(null)
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false)
  const [showBulkAddQuestionsModal, setShowBulkAddQuestionsModal] = useState(false)
  const [newQuestionPrompt, setNewQuestionPrompt] = useState('')
  const [bulkQuestionPrompts, setBulkQuestionPrompts] = useState('')
  const [questionEdits, setQuestionEdits] = useState({})
  const [dailyQuestionsTab, setDailyQuestionsTab] = useState('standard')
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState(null)
  const [newRolePerm, setNewRolePerm] = useState({
    discord_role_id: '',
    label: '',
    permission_level: 'moderator',
  })
  const [newOwnerUser, setNewOwnerUser] = useState({ discord_user_id: '', label: '' })
  const [modLogs, setModLogs] = useState([])
  const [modLogsLoading, setModLogsLoading] = useState(false)
  const [modLogEventFilter, setModLogEventFilter] = useState('')
  const [modLogEmbedTab, setModLogEmbedTab] = useState('member')
  const [modLogEmbeds, setModLogEmbeds] = useState(() =>
    parseModLogEmbedsFromSettings(SETTING_DEFAULTS),
  )
  const [savedModLogEmbeds, setSavedModLogEmbeds] = useState(() =>
    parseModLogEmbedsFromSettings(SETTING_DEFAULTS),
  )

  const canModLogsConfig = isFullAdmin && featureAccess.mod_logs_config !== false
  const canModLogsView = isFullAdmin || Boolean(featureAccess.mod_logs_view)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setShowHint(false)
    try {
      if (hasStaffCode) {
        const data = await fetchBotConfig(code)
        setConfig(data)
        setDraft(data.settings)
        const embeds = parseModLogEmbedsFromSettings(data.settings)
        setModLogEmbeds(embeds)
        setSavedModLogEmbeds(embeds)
      } else if (canModLogsView) {
        setConfig({
          settings: { ...SETTING_DEFAULTS },
          reactionRoles: [],
          messages: [],
          discordCache: [],
          dailyQuestions: [],
          rolePermissions: [],
          userPermissions: [],
        })
        setDraft(null)
      } else {
        setError('You do not have access to the Discord bot admin.')
      }
    } catch (err) {
      setError(err.message || 'Could not load bot config')
      setShowHint(isMigrationError(err.message))
    } finally {
      setLoading(false)
    }
  }, [code, hasStaffCode, canModLogsView])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const nextPrompts = {}
    for (const q of config.dailyQuestions || []) {
      nextPrompts[q.id] = q.prompt || ''
    }
    setQuestionEdits(nextPrompts)
  }, [config.dailyQuestions])

  const dailyQuestionsByTab = useMemo(() => {
    const grouped = Object.fromEntries(QOTD_QUESTION_TYPES.map((t) => [t.value, []]))
    for (const q of config.dailyQuestions || []) {
      const type = q.question_type || 'standard'
      if (grouped[type]) grouped[type].push(q)
    }
    return grouped
  }, [config.dailyQuestions])

  const activeTabQuestions = dailyQuestionsByTab[dailyQuestionsTab] || []

  const activeQotdTypeMeta = QOTD_QUESTION_TYPES.find((t) => t.value === dailyQuestionsTab)

  const qotdBonusScheduleDirty = useMemo(() => {
    if (!draft || !config.settings) return false
    return Object.values(QOTD_BONUS_SCHEDULE_SETTINGS).some(
      (keys) =>
        String(draft[keys.day] ?? '') !== String(config.settings[keys.day] ?? '') ||
        String(draft[keys.hour] ?? '') !== String(config.settings[keys.hour] ?? '') ||
        String(draft[keys.minute] ?? '') !== String(config.settings[keys.minute] ?? ''),
    )
  }, [draft, config.settings])

  const modLogEmbedsDirty = useMemo(
    () => !modLogEmbedsEqual(modLogEmbeds, savedModLogEmbeds),
    [modLogEmbeds, savedModLogEmbeds],
  )

  const isDirty = useMemo(() => {
    if (!draft || !config.settings) return false
    const settingsDirty = Object.keys(draft).some((k) => draft[k] !== config.settings[k])
    return settingsDirty || modLogEmbedsDirty
  }, [draft, config.settings, modLogEmbedsDirty])

  const voiceChannels = useMemo(
    () => channelsFromCache(config.discordCache, 'voice'),
    [config.discordCache],
  )

  const modLogChannelNameMap = useMemo(
    () => channelNameMapFromDiscordCache(config.discordCache),
    [config.discordCache],
  )

  const livePanelCount = useMemo(
    () => config.messages.filter((m) => m.discord_message_id).length,
    [config.messages],
  )

  const credentialsReady = useMemo(() => {
    if (!draft) return false
    return (
      draft.discord_token === SECRET_PLACEHOLDER &&
      draft.discord_client_id === SECRET_PLACEHOLDER
    )
  }, [draft])

  const canCredentials = isFullAdmin || featureAccess.credentials
  const canServer = isFullAdmin || featureAccess.server
  const canPanels = isFullAdmin || featureAccess.panels
  const canQotd = isFullAdmin || featureAccess.qotd
  const canSessionLogs = isFullAdmin && featureAccess.session_logs !== false
  const canRolePermissions = isFullAdmin && featureAccess.role_permissions !== false

  const qotdUtcTimeValue = useMemo(() => {
    if (!draft) return '12:00'
    const hour = Number.parseInt(String(draft.qotd_post_hour_utc ?? '12'), 10)
    const minute = Number.parseInt(String(draft.qotd_post_minute_utc ?? '0'), 10)
    const safeHour = Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 12
    const safeMinute = Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : 0
    return `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`
  }, [draft])

  const qotdLocalTimePreview = useMemo(
    () => localTimePreviewFromUtc(qotdUtcTimeValue),
    [qotdUtcTimeValue],
  )

  const activeBonusSchedule = QOTD_BONUS_SCHEDULE_SETTINGS[dailyQuestionsTab]

  const bonusUtcTimeValue = useMemo(() => {
    if (!activeBonusSchedule || !draft) return '18:00'
    return formatQotdUtcTimeFromDraft(
      draft,
      activeBonusSchedule.hour,
      activeBonusSchedule.minute,
      Number.parseInt(activeBonusSchedule.defaultHour, 10),
      Number.parseInt(activeBonusSchedule.defaultMinute, 10),
    )
  }, [draft, activeBonusSchedule])

  const bonusLocalTimePreview = useMemo(
    () => localTimePreviewFromUtc(bonusUtcTimeValue),
    [bonusUtcTimeValue],
  )

  function goHub() {
    setSection('hub')
    setServerSubsection('hub')
    setQotdSubsection('hub')
    setEditingPanel(null)
    setPendingTemplate(null)
  }

  function goSection(next) {
    setSection(next)
    if (next === 'server') {
      setServerSubsection('hub')
      setQotdSubsection('hub')
    }
    setEditingPanel(null)
    setPendingTemplate(null)
  }

  function openQotdSubsection(next) {
    setServerSubsection('qotd')
    setQotdSubsection(next)
    if (next === 'questions') setDailyQuestionsOpen(true)
  }

  function openPanel(panel) {
    setSection('panels')
    setEditingPanel(panel)
    setPendingTemplate(null)
  }

  function openNewPanel(template = null) {
    setSection('panels')
    setPendingTemplate(template)
    setEditingPanel('new')
  }

  function setField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function setSecretField(key, value) {
    setField(key, value)
  }

  function setQotdUtcTime(value) {
    const [hourStr = '12', minuteStr = '00'] = String(value || '').split(':')
    const hour = Number.parseInt(hourStr, 10)
    const minute = Number.parseInt(minuteStr, 10)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return
    setField('qotd_post_hour_utc', String(Math.max(0, Math.min(23, hour))))
    setField('qotd_post_minute_utc', String(Math.max(0, Math.min(59, minute))))
  }

  function setBonusQotdUtcTime(type, value) {
    const keys = QOTD_BONUS_SCHEDULE_SETTINGS[type]
    if (!keys) return
    const [hourStr = '18', minuteStr = '00'] = String(value || '').split(':')
    const hour = Number.parseInt(hourStr, 10)
    const minute = Number.parseInt(minuteStr, 10)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return
    setField(keys.hour, String(Math.max(0, Math.min(23, hour))))
    setField(keys.minute, String(Math.max(0, Math.min(59, minute))))
  }

  function setQotdToNextUtcMinute() {
    const dt = new Date(Date.now() + 60_000)
    const hour = dt.getUTCHours()
    const minute = dt.getUTCMinutes()
    setField('qotd_post_hour_utc', String(hour))
    setField('qotd_post_minute_utc', String(minute))
    setMessage(
      `Schedule draft set to ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} UTC — click Save settings, then Reset today's lock, then wait for that minute (bot polls every 60s).`,
    )
  }

  async function handleSaveSettings() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const next = await saveBotSettings(code, {
        ...draft,
        ...modLogEmbedsToSettingsPayload(modLogEmbeds),
      })
      setConfig(next)
      setDraft(next.settings)
      const embeds = parseModLogEmbedsFromSettings(next.settings)
      setModLogEmbeds(embeds)
      setSavedModLogEmbeds(embeds)
      setMessage(
        'Settings saved to skz_bot_settings. Run /reload in Discord (or wait for the outbox poll) to apply.',
      )
    } catch (err) {
      setError(err.message || 'Save failed')
      setShowHint(isMigrationError(err.message))
    } finally {
      setBusy(false)
    }
  }

  async function handleSyncDiscord() {
    setBusy(true)
    setError('')
    try {
      await queueBotAction(code, 'SYNC_GUILD_CACHE')
      setMessage(
        'Sync queued. The bot will refresh channel/role dropdowns shortly (or run /reload now). Click Refresh here after.',
      )
    } catch (err) {
      setError(err.message || 'Queue failed')
    } finally {
      setBusy(false)
    }
  }

  async function addDailyQuestion() {
    const prompt = newQuestionPrompt.trim()
    if (!prompt) return
    setBusy(true)
    try {
      const next = await createDailyQuestion(code, prompt, true, dailyQuestionsTab)
      setConfig(next)
      setMessage('Daily question added.')
      setShowAddQuestionModal(false)
      setNewQuestionPrompt('')
    } catch (err) {
      setError(err.message || 'Could not add daily question')
    } finally {
      setBusy(false)
    }
  }

  async function patchDailyQuestion(id, patch) {
    setBusy(true)
    try {
      const next = await updateDailyQuestion(code, id, patch)
      setConfig(next)
    } catch (err) {
      setError(err.message || 'Could not update daily question')
    } finally {
      setBusy(false)
    }
  }

  async function removeDailyQuestion(id) {
    setBusy(true)
    try {
      const next = await deleteDailyQuestion(code, id)
      setConfig(next)
      setPendingDeleteQuestion(null)
    } catch (err) {
      setError(err.message || 'Could not delete daily question')
    } finally {
      setBusy(false)
    }
  }

  async function addBulkDailyQuestions() {
    const items = String(bulkQuestionPrompts || '')
      .split('\n')
      .map((line) => {
        if (dailyQuestionsTab === 'standard') return parseBulkQotdLine(line)
        const prompt = String(line || '').trim()
        return prompt ? { question_type: dailyQuestionsTab, prompt } : null
      })
      .filter(Boolean)
    if (items.length === 0) return
    setBusy(true)
    setError('')
    try {
      let next = config
      for (const item of items) {
        next = await createDailyQuestion(code, item.prompt, true, item.question_type)
      }
      setConfig(next)
      setShowBulkAddQuestionsModal(false)
      setBulkQuestionPrompts('')
      setMessage(`${items.length} daily question${items.length === 1 ? '' : 's'} added.`)
    } catch (err) {
      setError(err.message || 'Could not add daily questions')
    } finally {
      setBusy(false)
    }
  }

  async function runDailyQuestionNow() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await queueBotAction(code, 'RUN_DAILY_QUESTION_NOW')
      setMessage(
        'Immediate QOTD test queued (bypasses schedule; posts standard plus any bonus type scheduled for today UTC). Check Discord shortly.',
      )
    } catch (err) {
      setError(err.message || 'Could not queue QOTD run')
    } finally {
      setBusy(false)
    }
  }

  async function resetQotdSchedulerLock() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await queueBotAction(code, 'RESET_QOTD_SCHEDULER_LOCK')
      setMessage(
        "Today's scheduler lock cleared. The bot can post again at the scheduled UTC minute (once per test).",
      )
    } catch (err) {
      setError(err.message || 'Could not reset scheduler lock')
    } finally {
      setBusy(false)
    }
  }

  async function runQotdSchedulerTest() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await queueBotAction(code, 'RUN_DAILY_QUESTION_SCHEDULER_TEST')
      setMessage(
        'Scheduler test queued. This uses the real schedule check (current UTC must match saved time) and clears today\'s lock first.',
      )
    } catch (err) {
      setError(err.message || 'Could not queue scheduler test')
    } finally {
      setBusy(false)
    }
  }

  async function loadSessionLogs() {
    if (!isFullAdmin) return
    setLogsLoading(true)
    try {
      const rows = await fetchAdminSessionLogs(150)
      setSessionLogs(rows)
    } catch (err) {
      setError(err.message || 'Could not load session logs')
    } finally {
      setLogsLoading(false)
    }
  }

  async function loadModLogs(eventType = modLogEventFilter) {
    if (!canModLogsView) return
    setModLogsLoading(true)
    try {
      const rows = await fetchAdminModLogs(150, eventType || null)
      setModLogs(rows)
    } catch (err) {
      setError(err.message || 'Could not load moderation logs')
      setShowHint(isMigrationError(err.message))
    } finally {
      setModLogsLoading(false)
    }
  }

  async function persistPanel({ panel, roles }, deploy = false) {
    setBusy(true)
    setError('')
    try {
      let next = await upsertBotMessage(code, panel)
      const saved =
        next.messages.find((m) => m.id === panel.id) ||
        next.messages.find((m) => m.slug === panel.slug)
      if (!saved) throw new Error('Panel save failed')
      const panelId = saved.id

      const prevRoleIds = config.reactionRoles
        .filter((r) => r.bot_message_id === panelId)
        .map((r) => r.id)
      const keepIds = new Set(roles.filter((r) => r.id).map((r) => r.id))

      for (const id of prevRoleIds) {
        if (!keepIds.has(id)) {
          next = await deleteReactionRole(code, id)
        }
      }

      for (const role of roles) {
        const payload = {
          bot_message_id: panelId,
          channel_id: saved.channel_id || panel.channel_id,
          message_id: '',
          emoji: role.emoji,
          role_id: role.role_id,
          category: role.category,
          label: role.label,
          remove_on_unreact:
            panel.kind === 'verify' ? false : role.remove_on_unreact !== false,
          button_style: role.button_style,
          button_emoji: role.button_emoji,
        }
        if (role.id) {
          next = await updateReactionRole(code, role.id, payload)
        } else {
          next = await createReactionRole(code, payload)
        }
      }

      if (deploy) {
        await queueBotAction(code, 'DEPLOY_MESSAGE', { message_id: panelId })
      }

      setConfig(next)
      const refreshed = next.messages.find((m) => m.id === panelId)
      if (refreshed) setEditingPanel(refreshed)
      setMessage(
        deploy
          ? 'Published — the bot will post or update the Discord message shortly (usually within a second).'
          : 'Draft saved.',
      )
    } catch (err) {
      setError(err.message || (deploy ? 'Publish failed' : 'Save failed'))
      throw err
    } finally {
      setBusy(false)
    }
  }

  const panelTitle =
    editingPanel && editingPanel !== 'new'
      ? editingPanel.label || editingPanel.slug
      : editingPanel === 'new'
        ? pendingTemplate?.label || 'New panel'
        : null

  function buildBreadcrumbs() {
    const root = { key: 'hub', label: 'Discord bot', onClick: goHub }
    if (section === 'hub') return [root]
    if (section === 'credentials') {
      return [root, { key: 'credentials', label: 'Credentials' }]
    }
    if (section === 'server') {
      const items = [
        root,
        {
          key: 'server',
          label: 'Server',
          onClick: () => {
            setServerSubsection('hub')
            setQotdSubsection('hub')
          },
        },
      ]
      if (serverSubsection !== 'hub') {
        const labelMap = {
          guild: 'Guild settings',
          voice: 'Join-to-create voice hub',
          qotd: 'Question of the day',
        }
        const parentLabel = labelMap[serverSubsection] || 'Details'
        items.push({
          key: `server-${serverSubsection}`,
          label: parentLabel,
          onClick:
            serverSubsection === 'qotd'
              ? () => setQotdSubsection('hub')
              : undefined,
        })
        if (serverSubsection === 'qotd' && qotdSubsection !== 'hub') {
          const qotdLabelMap = {
            schedule: 'Schedule',
            questions: 'Daily questions',
          }
          items.push({
            key: `qotd-${qotdSubsection}`,
            label: qotdLabelMap[qotdSubsection] || 'Details',
          })
        }
      }
      return items
    }
    if (section === 'panels') {
      const items = [
        root,
        { key: 'panels', label: 'Reaction panels', onClick: () => goSection('panels') },
      ]
      if (editingPanel) {
        items.push({ key: 'panel', label: panelTitle || 'Panel' })
      }
      return items
    }
    if (section === 'logs') {
      return [root, { key: 'logs', label: 'Session logs' }]
    }
    if (section === 'permissions') {
      return [root, { key: 'permissions', label: 'Role permissions' }]
    }
    if (section === 'mod_config') {
      return [root, { key: 'mod_config', label: 'Moderation logging' }]
    }
    if (section === 'mod_logs') {
      return [root, { key: 'mod_logs', label: 'Moderation logs' }]
    }
    return [root]
  }

  const breadcrumbItems = buildBreadcrumbs()

  const serverPageHeader = useMemo(() => {
    if (serverSubsection === 'guild') {
      return {
        title: 'Guild settings',
        description: 'Core server identity and cache sync dependencies.',
      }
    }
    if (serverSubsection === 'voice') {
      return {
        title: 'Join-to-create voice hub',
        description: 'Configure where personal voice channels are created and how they are named.',
      }
    }
    if (serverSubsection === 'qotd') {
      if (qotdSubsection === 'schedule') {
        return {
          title: 'Schedule',
          description: 'Control where and when the daily question thread is posted.',
        }
      }
      if (qotdSubsection === 'questions') {
        return {
          title: 'Daily questions',
          description:
            'Question of the day runs every day. Bonus types post on their configured UTC weekday.',
        }
      }
      return {
        title: 'Question of the day',
        description: 'Schedule automation and manage your daily question bank.',
      }
    }
    return {
      title: 'Server',
      description:
        'Guild ID is the source of truth — changing it here updates the table on save. Run Sync Discord dropdowns after setting a guild ID.',
    }
  }, [serverSubsection, qotdSubsection])

  if (loading || (hasStaffCode && !draft)) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" />
        Loading bot config…
      </div>
    )
  }

  if (!hasStaffCode && !canModLogsView) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-[#121214] p-6 text-sm text-zinc-400">
        Your account does not have permission to view the Discord bot admin.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Discord bot</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            {moderatorOnly
              ? 'Moderator access — view moderation logs as allowed by your role.'
              : 'Configure credentials, server options, reaction panels, and moderation logging — all stored in Supabase.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSyncDiscord}
            disabled={busy || !draft.guild_id}
            className={UI_BUTTON_SECONDARY}
          >
            Sync Discord dropdowns
          </button>
          <button
            type="button"
            onClick={load}
            className={UI_BUTTON_SECONDARY}
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {showHint && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <span className="font-semibold">Migration required: </span>
          {MIGRATION_HINT}
        </p>
      )}

      {section === 'hub' && (
        <SectionShell>
          <div className="mb-8">
            <h3 className="text-xl font-bold tracking-tight text-white">Bot settings</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Choose a section to configure. Changes save to{' '}
              <code className="rounded bg-zinc-800 px-1 text-xs">skz_bot_settings</code>{' '}
              and panel tables.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <HubCard
              icon={LayoutGrid}
              iconBg="bg-violet-500/15 text-violet-400"
              title="Reaction panels"
              description="Verify gates, role menus, and announcement embeds."
              tag={
                config.messages.length
                  ? `${config.messages.length} panel${config.messages.length === 1 ? '' : 's'} · ${livePanelCount} live`
                  : 'None yet'
              }
              tagColor="text-sky-400 bg-sky-500/10"
              onClick={() => goSection('panels')}
            />
            {canCredentials && (
              <HubCard
              icon={KeyRound}
              iconBg="bg-amber-500/15 text-amber-400"
              title="Credentials"
              description="Discord token, client ID, and Supabase keys for the bot runtime."
              tag={credentialsReady ? 'Configured' : 'Needs setup'}
              tagColor={
                credentialsReady
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-amber-400 bg-amber-500/10'
              }
              onClick={() => goSection('credentials')}
            />
            )}
            {canServer && (
              <HubCard
              icon={Server}
              iconBg="bg-emerald-500/15 text-emerald-400"
              title="Server"
              description="Guild ID, join-to-create voice hub, and personal VC naming."
              tag={draft.guild_id ? 'Guild linked' : 'No guild ID'}
              tagColor={
                draft.guild_id
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-zinc-400 bg-zinc-500/10'
              }
              onClick={() => goSection('server')}
            />
            )}
            {canSessionLogs && (
              <HubCard
                icon={Clock3}
                iconBg="bg-sky-500/15 text-sky-400"
                title="Session logs"
                description="See who signed in, Discord IDs, durations, and session status."
                tag={`${sessionLogs.length || 0} recent`}
                tagColor="text-sky-400 bg-sky-500/10"
                onClick={() => {
                  goSection('logs')
                  loadSessionLogs()
                }}
              />
            )}
            {canRolePermissions && (
              <HubCard
                icon={Bot}
                iconBg="bg-fuchsia-500/15 text-fuchsia-400"
                title="Role permissions"
                description="Map Discord roles to permission levels and bot feature toggles."
                tag={`${(config.rolePermissions || []).length} mapped`}
                tagColor="text-fuchsia-300 bg-fuchsia-500/15"
                onClick={() => goSection('permissions')}
              />
            )}
            {canModLogsConfig && (
              <HubCard
                icon={Shield}
                iconBg="bg-rose-500/15 text-rose-400"
                title="Moderation logging"
                description="Join logs, message edits/deletes, and log channels."
                tag={draft?.mod_log_enabled === 'true' ? 'Enabled' : 'Disabled'}
                tagColor={
                  draft?.mod_log_enabled === 'true'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-zinc-400 bg-zinc-500/10'
                }
                onClick={() => goSection('mod_config')}
              />
            )}
            {canModLogsView && (
              <HubCard
                icon={ScrollText}
                iconBg="bg-orange-500/15 text-orange-400"
                title="Moderation logs"
                description="Browse join, edit, and delete events recorded by the bot."
                tag="View history"
                tagColor="text-orange-300 bg-orange-500/15"
                onClick={() => {
                  goSection('mod_logs')
                  loadModLogs()
                }}
              />
            )}
          </div>
        </SectionShell>
      )}

      {section === 'credentials' && canCredentials && (
        <SectionShell>
          <BotBreadcrumb items={breadcrumbItems} />
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight text-white">Credentials</h3>
            <p className="mt-1 text-sm text-zinc-500">
              The bot reads these from{' '}
              <code className="rounded bg-zinc-800 px-1 text-xs">skz_bot_settings</code>{' '}
              on every start and /reload — not from Railway env or{' '}
              <code className="rounded bg-zinc-800 px-1 text-xs">apps/bot/.env</code>.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SecretField
              label="Discord bot token"
              value={draft.discord_token}
              onChange={(v) => setSecretField('discord_token', v)}
              placeholder={
                draft.discord_token === SECRET_PLACEHOLDER
                  ? '•••••••• (saved — type to replace)'
                  : 'Bot token from Developer Portal'
              }
            />
            <SecretField
              label="Discord client ID"
              value={draft.discord_client_id}
              onChange={(v) => setSecretField('discord_client_id', v)}
              placeholder={
                draft.discord_client_id === SECRET_PLACEHOLDER
                  ? '•••••••• (saved)'
                  : 'Application ID'
              }
            />
            <SecretField
              label="Supabase URL"
              value={draft.supabase_url}
              onChange={(v) => setSecretField('supabase_url', v)}
              placeholder={
                draft.supabase_url === SECRET_PLACEHOLDER
                  ? '•••••••• (saved)'
                  : 'https://xxx.supabase.co'
              }
            />
            <SecretField
              label="Supabase service role key"
              value={draft.supabase_service_role_key}
              onChange={(v) => setSecretField('supabase_service_role_key', v)}
              placeholder={
                draft.supabase_service_role_key === SECRET_PLACEHOLDER
                  ? '•••••••• (saved — type to replace)'
                  : 'service_role key'
              }
            />
          </div>
          <SettingsActions
            isDirty={isDirty}
            busy={busy}
            onReset={() => setDraft(config.settings)}
            onSave={handleSaveSettings}
          />
        </SectionShell>
      )}

      {section === 'server' && canServer && (
        <SectionShell>
          <BotBreadcrumb items={breadcrumbItems} />
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight text-white">{serverPageHeader.title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{serverPageHeader.description}</p>
          </div>
          {serverSubsection === 'hub' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <HubCard
                icon={Server}
                iconBg="bg-emerald-500/15 text-emerald-400"
                title="Guild settings"
                description="Guild identity and base server linkage for bot configuration."
                tag={draft.guild_id ? 'Guild linked' : 'Needs guild ID'}
                tagColor={
                  draft.guild_id
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-amber-400 bg-amber-500/10'
                }
                onClick={() => setServerSubsection('guild')}
              />
              <HubCard
                icon={Bot}
                iconBg="bg-sky-500/15 text-sky-400"
                title="Join-to-create voice hub"
                description="Hub channel, personal VC category, and naming pattern."
                tag={draft.join_to_create_channel_id ? 'Configured' : 'Not configured'}
                tagColor={
                  draft.join_to_create_channel_id
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-zinc-400 bg-zinc-500/10'
                }
                onClick={() => setServerSubsection('voice')}
              />
              <HubCard
                icon={Clock3}
                iconBg="bg-violet-500/15 text-violet-400"
                title="Question of the day"
                description="Schedule, target channel, thread format, and question bank."
                tag={
                  canQotd
                    ? String(draft.qotd_enabled || 'false').toLowerCase() === 'true'
                      ? 'Enabled'
                      : 'Disabled'
                    : 'No access'
                }
                tagColor={
                  !canQotd
                    ? 'text-zinc-400 bg-zinc-500/10'
                    : String(draft.qotd_enabled || 'false').toLowerCase() === 'true'
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-amber-400 bg-amber-500/10'
                }
                onClick={() => canQotd && openQotdSubsection('hub')}
              />
            </div>
          )}

          {serverSubsection === 'guild' && (
            <>
              <div className="mb-3 rounded-xl border border-zinc-800/80 bg-[#121219] px-4 py-3 text-xs text-zinc-400">
                Server / Guild settings
              </div>
              <SubCard
                title="Guild settings"
                description="Core server identity and cache sync dependencies."
              >
                <div className="space-y-4">
                  <Field
                    label="Guild ID"
                    hint="Right-click your server in Discord (Developer Mode) -> Copy Server ID."
                    value={draft.guild_id}
                    onChange={(v) => setField('guild_id', v)}
                    placeholder="123456789012345678"
                  />
                </div>
              </SubCard>
              <SettingsActions
                isDirty={isDirty}
                busy={busy}
                onReset={() => setDraft(config.settings)}
                onSave={handleSaveSettings}
              />
            </>
          )}

          {serverSubsection === 'voice' && (
            <>
              <div className="mb-3 rounded-xl border border-zinc-800/80 bg-[#121219] px-4 py-3 text-xs text-zinc-400">
                Server / Join-to-create voice hub
              </div>
              <SubCard
                title="Join-to-create voice hub"
                description="Configure where personal voice channels are created and how they are named."
              >
                <div className="space-y-4">
                  <DiscordEntitySelect
                    label="Join-to-create hub (voice)"
                    value={draft.join_to_create_channel_id}
                    onChange={(v) => setField('join_to_create_channel_id', v)}
                    options={voiceChannels}
                    placeholder="Select hub voice channel..."
                  />
                  <DiscordEntitySelect
                    label="Personal VC category (optional)"
                    value={draft.join_to_create_category_id}
                    onChange={(v) => setField('join_to_create_category_id', v)}
                    options={config.discordCache.filter(
                      (e) => e.entity_type === 'channel' && e.channel_type === 4,
                    )}
                    placeholder="Category (optional)"
                  />
                  <Field
                    label="Personal VC name pattern"
                    hint="{username} or {displayname}"
                    value={draft.join_to_create_name_pattern}
                    onChange={(v) => setField('join_to_create_name_pattern', v)}
                  />
                </div>
              </SubCard>
              <SettingsActions
                isDirty={isDirty}
                busy={busy}
                onReset={() => setDraft(config.settings)}
                onSave={handleSaveSettings}
              />
            </>
          )}

          {serverSubsection === 'qotd' && canQotd && (
            <>
              {qotdSubsection === 'hub' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <HubCard
                    icon={Clock3}
                    iconBg="bg-violet-500/15 text-violet-400"
                    title="Schedule"
                    description="Enable QOTD, pick channel, daily UTC time, and thread name."
                    tag={
                      String(draft.qotd_enabled || 'false').toLowerCase() === 'true'
                        ? 'Enabled'
                        : 'Disabled'
                    }
                    tagColor={
                      String(draft.qotd_enabled || 'false').toLowerCase() === 'true'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-amber-400 bg-amber-500/10'
                    }
                    onClick={() => openQotdSubsection('schedule')}
                  />
                  <HubCard
                    icon={ListOrdered}
                    iconBg="bg-sky-500/15 text-sky-400"
                    title="Daily questions"
                    description="Banks per type — QOTD daily, bonuses on set weekdays."
                    tag={`${(config.dailyQuestions || []).length} question${(config.dailyQuestions || []).length === 1 ? '' : 's'}`}
                    tagColor="text-sky-400 bg-sky-500/10"
                    onClick={() => openQotdSubsection('questions')}
                  />
                </div>
              )}

              {qotdSubsection === 'schedule' && (
                <>
                  <SubCard
                    title="Schedule"
                    description="Control where and when the daily thread is posted."
                    actions={
                      <button
                        type="button"
                        onClick={setQotdToNextUtcMinute}
                        className={`${UI_BUTTON_SECONDARY} h-8 px-2.5 text-xs`}
                      >
                        Set next minute (schedule)
                      </button>
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ToggleField
                        label="Enable question of the day"
                        checked={String(draft.qotd_enabled || 'false').toLowerCase() === 'true'}
                        onChange={(next) => setField('qotd_enabled', next ? 'true' : 'false')}
                      />
                      <DiscordEntitySelect
                        label="QOTD target channel"
                        value={draft.qotd_channel_id}
                        onChange={(v) => setField('qotd_channel_id', v)}
                        options={channelsFromCache(config.discordCache, 'text')}
                        placeholder="Select channel..."
                      />
                      <label className="block space-y-1 sm:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          QOTD daily time (UTC)
                        </span>
                        <input
                          type="time"
                          step="60"
                          value={qotdUtcTimeValue}
                          onChange={(e) => setQotdUtcTime(e.target.value)}
                          className={UI_INPUT}
                        />
                        <p className="text-xs text-zinc-500">
                          Question of the day posts at{' '}
                          <span className="text-zinc-300">{qotdUtcTimeValue} UTC</span> (
                          {qotdLocalTimePreview} local) every day. Bonus types use their own UTC
                          day and time on the Daily questions page.
                        </p>
                        <p className="text-xs text-zinc-500">
                          Each type has its own schedule minute and once-per-day lock.
                        </p>
                      </label>
                      <Field
                        label="QOTD thread name format"
                        hint="Use {date}"
                        value={draft.qotd_thread_name_format}
                        onChange={(v) => setField('qotd_thread_name_format', v)}
                        placeholder="QOTD - {date}"
                      />
                    </div>
                  </SubCard>

                  <div className="mt-4 rounded-xl border border-zinc-800/90 bg-[#111117] p-4">
                    <h4 className="text-sm font-semibold text-zinc-100">Test the scheduler</h4>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-zinc-500">
                      <li>Enable QOTD, set channel, and schedule time — then Save settings.</li>
                      <li>
                        Optional: Set next minute (schedule), then Save settings again.
                      </li>
                      <li>Reset today&apos;s scheduler lock (clears the once-per-day block).</li>
                      <li>
                        Wait until the current UTC minute matches your saved time (bot checks every
                        60s), or click Run scheduler check when the clock matches.
                      </li>
                    </ol>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={resetQotdSchedulerLock}
                        className={`${UI_BUTTON_SECONDARY} h-8 px-2.5 text-xs`}
                      >
                        Reset today&apos;s lock
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={runQotdSchedulerTest}
                        className={`${UI_BUTTON_SECONDARY} h-8 px-2.5 text-xs`}
                      >
                        Run scheduler check
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={runDailyQuestionNow}
                        className="inline-flex h-8 items-center rounded-lg border border-violet-400/40 bg-violet-500/10 px-2.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
                      >
                        Run now (bypass schedule)
                      </button>
                    </div>
                  </div>
                  <SettingsActions
                    isDirty={isDirty}
                    busy={busy}
                    onReset={() => setDraft(config.settings)}
                    onSave={handleSaveSettings}
                  />
                </>
              )}

              {qotdSubsection === 'questions' && (
                <div className="overflow-hidden rounded-xl border border-zinc-800/90 bg-[#18181b]">
                  <div className="px-5 pt-4">
                    <p className="text-sm text-zinc-500">
                      Question of the day posts every day (time on Schedule). Bonus types post on
                      their own UTC weekday and time — separate from the main QOTD.
                    </p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Question bank
                    </p>
                    <div
                      className="mt-2 grid grid-cols-1 gap-1.5 rounded-xl border border-zinc-700/80 bg-[#0f0f14] p-1.5 sm:grid-cols-3"
                      role="tablist"
                      aria-label="Question types"
                    >
                      {QOTD_QUESTION_TYPES.map((t) => {
                        const count = (dailyQuestionsByTab[t.value] || []).length
                        const active = dailyQuestionsTab === t.value
                        return (
                          <button
                            key={t.value}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setDailyQuestionsTab(t.value)}
                            className={`flex min-h-[2.75rem] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2.5 text-center text-sm font-medium transition sm:min-h-[3rem] ${
                              active
                                ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40 ring-1 ring-violet-400/50'
                                : 'border border-transparent bg-[#18181b] text-zinc-400 hover:border-zinc-600/60 hover:bg-[#1e1e26] hover:text-zinc-200'
                            }`}
                          >
                            <span className="leading-tight">{t.label}</span>
                            <span
                              className={`text-[11px] font-semibold tabular-nums ${
                                active ? 'text-violet-100/90' : 'text-zinc-500'
                              }`}
                            >
                              {count} question{count === 1 ? '' : 's'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div
                    className="mt-4 border-t border-zinc-800/80 bg-[#141418] px-5 py-4"
                    role="tabpanel"
                  >
                    <h3 className="text-base font-semibold text-zinc-100">
                      {activeQotdTypeMeta?.label}
                    </h3>
                    {dailyQuestionsTab !== 'standard' && activeBonusSchedule && (
                      <div className="mb-4 mt-3 rounded-xl border border-zinc-800/80 bg-[#111117] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Schedule (UTC)
                        </p>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          <label className="block space-y-1">
                            <span className="text-xs text-zinc-500">Post day</span>
                            <select
                              value={
                                draft[activeBonusSchedule.day] ?? activeBonusSchedule.defaultDay
                              }
                              onChange={(e) =>
                                setField(activeBonusSchedule.day, e.target.value)
                              }
                              className={UI_SELECT}
                            >
                              {QOTD_WEEKDAYS_UTC.map((d) => (
                                <option key={d.value} value={d.value}>
                                  {d.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs text-zinc-500">Post time</span>
                            <input
                              type="time"
                              step="60"
                              value={bonusUtcTimeValue}
                              onChange={(e) =>
                                setBonusQotdUtcTime(dailyQuestionsTab, e.target.value)
                              }
                              className={UI_INPUT}
                            />
                          </label>
                        </div>
                        <p className="mt-3 text-xs text-zinc-500">
                          Posts on{' '}
                          <span className="text-zinc-300">
                            {qotdWeekdayLabel(
                              draft[activeBonusSchedule.day] ?? activeBonusSchedule.defaultDay,
                            )}
                          </span>{' '}
                          at <span className="text-zinc-300">{bonusUtcTimeValue} UTC</span>
                          {bonusLocalTimePreview ? ` (${bonusLocalTimePreview} local)` : ''}. Separate
                          from question of the day — save settings to apply.
                        </p>
                      </div>
                    )}

                    {dailyQuestionsTab === 'standard' && (
                      <p className="mb-4 mt-1 text-xs text-zinc-500">
                        Runs every day at the time set on the Schedule page.
                      </p>
                    )}

                    <div className="mb-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBulkQuestionPrompts('')
                          setShowBulkAddQuestionsModal(true)
                        }}
                        className={`${UI_BUTTON_SECONDARY} h-8 px-2.5 text-xs`}
                      >
                        Bulk add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewQuestionPrompt('')
                          setShowAddQuestionModal(true)
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-500 px-2.5 text-xs font-semibold text-white hover:bg-violet-400"
                      >
                        <Plus className="size-3.5" />
                        Add question
                      </button>
                    </div>

                    {activeTabQuestions.length === 0 ? (
                      <p className="rounded-xl border border-zinc-800/80 bg-[#111117] px-3 py-4 text-xs text-zinc-500">
                        No {activeQotdTypeMeta?.label?.toLowerCase() ?? 'questions'} yet.
                      </p>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-zinc-800/90 bg-[#111116]">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-[#1a1a21] text-xs uppercase tracking-wide text-zinc-500">
                              <tr>
                                <th className="px-3 py-2 text-left">Question</th>
                                <th className="px-3 py-2 text-left">Posted</th>
                                <th className="px-3 py-2 text-left">Last posted</th>
                                <th className="px-3 py-2 text-left">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/80 bg-[#121218]">
                              {activeTabQuestions.map((q) => (
                                <tr key={q.id}>
                                  <td className="px-3 py-2">
                                    <input
                                      value={questionEdits[q.id] ?? ''}
                                      onChange={(e) =>
                                        setQuestionEdits((prev) => ({
                                          ...prev,
                                          [q.id]: e.target.value,
                                        }))
                                      }
                                      className={`${UI_INPUT} h-9`}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-zinc-300">
                                    {Number(q.post_count || 0)}x
                                  </td>
                                  <td className="px-3 py-2 text-zinc-400">
                                    {q.last_posted_at
                                      ? formatDateTime(q.last_posted_at)
                                      : 'Not posted yet'}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        disabled={
                                          (questionEdits[q.id] ?? '') === (q.prompt || '') || busy
                                        }
                                        onClick={() =>
                                          patchDailyQuestion(q.id, {
                                            prompt: String(questionEdits[q.id] ?? ''),
                                          })
                                        }
                                        className={`${UI_BUTTON_SECONDARY} h-8 px-2.5 text-xs`}
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPendingDeleteQuestion(q)}
                                        className="h-8 rounded-lg bg-red-500/20 px-2.5 text-xs font-medium text-red-300"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {dailyQuestionsTab !== 'standard' && qotdBonusScheduleDirty && (
                      <SettingsActions
                        isDirty={qotdBonusScheduleDirty}
                        busy={busy}
                        onReset={() => setDraft(config.settings)}
                        onSave={handleSaveSettings}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </SectionShell>
      )}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-[#121214] p-5 shadow-2xl">
            <h4 className="text-base font-semibold text-zinc-100">
              Add {activeQotdTypeMeta?.label?.toLowerCase() ?? 'question'}
            </h4>
            <p className="mt-1 text-sm text-zinc-500">
              Saved to the {activeQotdTypeMeta?.label ?? 'current'} bank
              {dailyQuestionsTab === 'standard'
                ? ' (posts every day).'
                : activeBonusSchedule
                  ? ` (scheduled ${qotdWeekdayLabel(
                      draft[activeBonusSchedule.day] ?? activeBonusSchedule.defaultDay,
                    )} at ${bonusUtcTimeValue} UTC).`
                  : '.'}
            </p>
            <label className="mt-4 block text-xs font-medium text-zinc-400">Question</label>
            <textarea
              autoFocus
              value={newQuestionPrompt}
              onChange={(e) => setNewQuestionPrompt(e.target.value)}
              rows={4}
              placeholder="Type the question here..."
              className={`mt-4 ${UI_TEXTAREA}`}
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddQuestionModal(false)
                  setNewQuestionPrompt('')
                }}
                className={UI_BUTTON_SECONDARY}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addDailyQuestion}
                disabled={busy || !newQuestionPrompt.trim()}
                className={UI_BUTTON_PRIMARY}
              >
                Add question
              </button>
            </div>
          </div>
        </div>
      )}
      {showBulkAddQuestionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-[#121214] p-5 shadow-2xl">
            <h4 className="text-base font-semibold text-zinc-100">
              Bulk add — {activeQotdTypeMeta?.label ?? 'questions'}
            </h4>
            <p className="mt-1 text-sm text-zinc-500">
              One question per line. Empty lines are ignored.
              {dailyQuestionsTab === 'standard' && (
                <>
                  {' '}
                  Optional prefixes <code className="text-zinc-400">[wyr]</code> or{' '}
                  <code className="text-zinc-400">[throwback]</code> override the tab for that line.
                </>
              )}
            </p>
            <textarea
              autoFocus
              value={bulkQuestionPrompts}
              onChange={(e) => setBulkQuestionPrompts(e.target.value)}
              rows={8}
              placeholder={
                dailyQuestionsTab === 'standard'
                  ? 'What is your favourite SKZ era?\n[wyr] Changbin or Han rap line?\n[throwback] First STAY memory'
                  : 'Option A or Option B?\nAnother prompt...\nAnother prompt...'
              }
              className={`mt-4 ${UI_TEXTAREA}`}
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowBulkAddQuestionsModal(false)
                  setBulkQuestionPrompts('')
                }}
                className={UI_BUTTON_SECONDARY}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addBulkDailyQuestions}
                disabled={busy || !bulkQuestionPrompts.trim()}
                className={UI_BUTTON_PRIMARY}
              >
                Add all
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingDeleteQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121214] p-5 shadow-2xl">
            <h4 className="text-base font-semibold text-zinc-100">Delete daily question?</h4>
            <p className="mt-2 text-sm text-zinc-400">
              This will permanently remove this question from the QOTD bank.
            </p>
            <p className="mt-2 truncate rounded-lg border border-zinc-800 bg-[#0f0f13] px-3 py-2 text-sm text-zinc-200">
              {pendingDeleteQuestion.prompt || 'Untitled question'}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteQuestion(null)}
                className={UI_BUTTON_SECONDARY}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => removeDailyQuestion(pendingDeleteQuestion.id)}
                className="inline-flex h-9 items-center rounded-xl bg-red-500/85 px-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {section === 'panels' && canPanels && !editingPanel && config.messages.length > 0 && (
        <SectionShell>
          <BotBreadcrumb items={breadcrumbItems} />
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight text-white">Reaction panels</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Verify gates, role menus, and announcements.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {config.messages.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => openPanel(m)}
                className="group flex items-start gap-4 rounded-xl border border-zinc-800/80 bg-[#18181b] p-4 text-left transition-all hover:border-zinc-700 hover:bg-[#1c1c20]"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-100">
                      {m.label || m.slug}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                  </span>
                  <span className="mt-1 block text-sm capitalize text-zinc-500">
                    {m.kind?.replace('_', ' ')}
                  </span>
                  <span
                    className={`mt-3 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      m.discord_message_id
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-zinc-500/10 text-zinc-400'
                    }`}
                  >
                    {m.discord_message_id ? 'Live on Discord' : 'Draft'}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openNewPanel()}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#5865f2] px-4 text-sm font-semibold text-white hover:bg-[#4752c4]"
          >
            <Plus className="size-4" />
            New panel
          </button>
        </SectionShell>
      )}

      {section === 'panels' && canPanels && !editingPanel && config.messages.length === 0 && (
        <>
          <BotBreadcrumb items={breadcrumbItems} />
          <PanelTemplatePicker
            onSelect={(t) => {
              openNewPanel(t)
            }}
          />
        </>
      )}

      {section === 'panels' && canPanels && editingPanel && (
        <>
          <BotBreadcrumb items={breadcrumbItems} />
          <BotMessageEditor
            key={
              editingPanel === 'new'
                ? `new-${pendingTemplate?.id ?? 'pick'}`
                : editingPanel.id
            }
            message={editingPanel === 'new' ? null : editingPanel}
            initialTemplate={editingPanel === 'new' ? pendingTemplate : null}
            discordCache={config.discordCache}
            linkedRoles={config.reactionRoles.filter(
              (r) =>
                r.bot_message_id === (editingPanel === 'new' ? null : editingPanel.id),
            )}
            busy={busy}
            onDiscard={() => {
              setEditingPanel(null)
              setPendingTemplate(null)
            }}
            onSave={(payload) => persistPanel(payload, false)}
            onPublish={(payload) => persistPanel(payload, true)}
            onDeleteMessage={async (id) => {
              if (!window.confirm('Delete this panel?')) return
              setBusy(true)
              try {
                const next = await deleteBotMessage(code, id)
                setConfig(next)
                setEditingPanel(null)
              } catch (err) {
                setError(err.message)
              } finally {
                setBusy(false)
              }
            }}
          />
        </>
      )}

      {section === 'mod_config' && canModLogsConfig && draft && (
        <SectionShell>
          <BotBreadcrumb items={breadcrumbItems} />
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight text-white">Moderation logging</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Full-admin only. The bot mirrors events to Discord channels and stores them for
              the admin panel. Enable{' '}
              <strong className="font-medium text-zinc-300">Server Members</strong> and{' '}
              <strong className="font-medium text-zinc-300">Message Content</strong> intents in
              the Discord Developer Portal.
            </p>
          </div>
          <SubCard title="Master switch" description="Turn all moderation logging on or off.">
            <ToggleField
              label="Enable moderation logging"
              checked={draft.mod_log_enabled === 'true'}
              onChange={(next) =>
                setDraft((p) => ({ ...p, mod_log_enabled: next ? 'true' : 'false' }))
              }
            />
          </SubCard>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <SubCard
              title="Member events"
              description="Join logs and /info lookups post here."
            >
              <DiscordEntitySelect
                label="Join / account log channel"
                value={draft.mod_log_join_channel_id}
                onChange={(v) => setDraft((p) => ({ ...p, mod_log_join_channel_id: v }))}
                options={channelsFromCache(config.discordCache, 'text')}
                placeholder="Select channel"
              />
              <div className="mt-3 space-y-2">
                <ToggleField
                  label="Log member joins"
                  checked={draft.mod_log_member_join === 'true'}
                  onChange={(next) =>
                    setDraft((p) => ({ ...p, mod_log_member_join: next ? 'true' : 'false' }))
                  }
                />
              </div>
            </SubCard>
            <SubCard
              title="Message events"
              description="Edits, single deletes, and bulk deletes post here."
            >
              <DiscordEntitySelect
                label="Message log channel"
                value={draft.mod_log_message_channel_id}
                onChange={(v) => setDraft((p) => ({ ...p, mod_log_message_channel_id: v }))}
                options={channelsFromCache(config.discordCache, 'text')}
                placeholder="Select channel"
              />
              <div className="mt-3 space-y-2">
                <ToggleField
                  label="Log message edits"
                  checked={draft.mod_log_message_edits === 'true'}
                  onChange={(next) =>
                    setDraft((p) => ({
                      ...p,
                      mod_log_message_edits: next ? 'true' : 'false',
                    }))
                  }
                />
                <ToggleField
                  label="Log message deletes"
                  checked={draft.mod_log_message_deletes === 'true'}
                  onChange={(next) =>
                    setDraft((p) => ({
                      ...p,
                      mod_log_message_deletes: next ? 'true' : 'false',
                    }))
                  }
                />
                <ToggleField
                  label="Log bulk deletes"
                  checked={draft.mod_log_message_bulk_deletes === 'true'}
                  onChange={(next) =>
                    setDraft((p) => ({
                      ...p,
                      mod_log_message_bulk_deletes: next ? 'true' : 'false',
                    }))
                  }
                />
              </div>
            </SubCard>
          </div>

          <div className="mt-8">
            <SubCard
              title="Log embed appearance"
              description="Customize Discord embeds for each log type — same structure as reaction panels. Placeholders are filled when the bot posts."
            >
              <div
                className="mb-4 flex justify-center rounded-xl border border-zinc-700/80 bg-[#0f0f14] p-2"
                role="tablist"
                aria-label="Log embed templates"
              >
                <div className="inline-flex flex-wrap items-center justify-center gap-1.5">
                  {MOD_LOG_EMBED_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={modLogEmbedTab === t.id}
                      onClick={() => setModLogEmbedTab(t.id)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-center text-sm whitespace-nowrap transition ${
                        modLogEmbedTab === t.id
                          ? 'bg-violet-500/20 font-semibold text-violet-100 ring-1 ring-violet-500/40'
                          : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {MOD_LOG_EMBED_TEMPLATES.filter((t) => t.id === modLogEmbedTab).map((t) => (
                <div key={t.id}>
                  <p className="mb-4 text-sm text-zinc-500">{t.description}</p>
                  <ModLogEmbedEditor
                    templateId={t.id}
                    embed={modLogEmbeds[t.id]}
                    onChange={(next) =>
                      setModLogEmbeds((prev) => ({ ...prev, [t.id]: next }))
                    }
                  />
                </div>
              ))}
            </SubCard>
          </div>

          <SettingsActions
            isDirty={isDirty}
            busy={busy}
            onReset={() => {
              setDraft(config.settings)
              setModLogEmbeds(savedModLogEmbeds)
            }}
            onSave={handleSaveSettings}
          />
        </SectionShell>
      )}

      {section === 'mod_logs' && canModLogsView && (
        <SectionShell>
          <BotBreadcrumb items={breadcrumbItems} />
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white">Moderation logs</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Events the bot records in Discord and in the database. Mods need{' '}
                <strong className="font-medium text-zinc-300">Mod logs view</strong> on their
                role (Role permissions).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={`${UI_SELECT} h-9 w-auto min-w-[10rem]`}
                value={modLogEventFilter}
                onChange={(e) => setModLogEventFilter(e.target.value)}
              >
                {MOD_LOG_EVENT_TYPES.map((t) => (
                  <option key={t.value || 'all'} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => loadModLogs(modLogEventFilter)}
                className={UI_BUTTON_SECONDARY}
              >
                <RefreshCw className={`size-4 ${modLogsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          <ModLogsViewer
            rows={modLogs}
            loading={modLogsLoading}
            channelNameMap={modLogChannelNameMap}
          />
        </SectionShell>
      )}

      {section === 'logs' && canSessionLogs && (
        <SectionShell>
          <BotBreadcrumb
            items={[
              { key: 'hub', label: 'Discord bot', onClick: goHub },
              { key: 'logs', label: 'Session logs' },
            ]}
          />
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white">Session logs</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Full-admin view of authenticated staff sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={loadSessionLogs}
              className={UI_BUTTON_SECONDARY}
            >
              <RefreshCw className={`size-4 ${logsLoading ? 'animate-spin' : ''}`} />
              Refresh logs
            </button>
          </div>
          <AdminDataTable
            loading={logsLoading}
            emptyMessage="No session logs yet."
            columns={[
              {
                key: 'staff',
                label: 'Staff',
                render: (row) => row.display_name || 'Unknown',
              },
              {
                key: 'id',
                label: 'Discord ID',
                render: (row) => (
                  <span className="font-mono text-xs text-zinc-400">{row.discord_user_id}</span>
                ),
              },
              {
                key: 'perm',
                label: 'Permission',
                render: (row) => row.permission_level,
              },
              {
                key: 'started',
                label: 'Started',
                render: (row) => formatDateTime(row.created_at),
              },
              {
                key: 'ended',
                label: 'Ended',
                render: (row) => (row.ended_at ? formatDateTime(row.ended_at) : '—'),
              },
              {
                key: 'duration',
                label: 'Duration',
                render: (row) => formatDuration(row.duration_seconds),
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                      row.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : row.status === 'revoked'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-zinc-700/60 text-zinc-300'
                    }`}
                  >
                    {row.status}
                  </span>
                ),
              },
            ]}
            rows={sessionLogs.map((row) => ({ ...row, key: row.session_token }))}
          />
        </SectionShell>
      )}

      {section === 'permissions' && canRolePermissions && (
        <SectionShell>
          <BotBreadcrumb
            items={[
              { key: 'hub', label: 'Discord bot', onClick: goHub },
              { key: 'permissions', label: 'Role permissions' },
            ]}
          />
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight text-white">Role permissions</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Full-admin only. Owner user IDs always receive full admin; roles control everyone
              else. Grant moderators <strong className="text-zinc-300">Mod logs view</strong> to
              browse moderation history in this panel.
            </p>
          </div>
          <SubCard
            title="Owner accounts (Discord user ID)"
            description="Always full_admin regardless of server roles. Enable Developer Mode in Discord → right-click your profile → Copy User ID. Only existing full admins can edit this list (staff code required)."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Discord user ID"
                value={newOwnerUser.discord_user_id}
                onChange={(v) => setNewOwnerUser((p) => ({ ...p, discord_user_id: v.replace(/\D/g, '') }))}
                placeholder="e.g. 123456789012345678"
              />
              <Field
                label="Label"
                value={newOwnerUser.label}
                onChange={(v) => setNewOwnerUser((p) => ({ ...p, label: v }))}
                placeholder="Your name"
              />
              <div className="sm:col-span-2">
                <button
                  type="button"
                  disabled={!newOwnerUser.discord_user_id || busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      const next = await upsertUserPermission(code, {
                        discord_user_id: newOwnerUser.discord_user_id,
                        label: newOwnerUser.label || newOwnerUser.discord_user_id,
                      })
                      setConfig(next)
                      setNewOwnerUser({ discord_user_id: '', label: '' })
                    } catch (err) {
                      setError(err.message || 'Could not add owner account')
                    } finally {
                      setBusy(false)
                    }
                  }}
                  className={UI_BUTTON_PRIMARY}
                >
                  <Plus className="size-4" />
                  Add owner
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {(config.userPermissions || []).length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No owner user IDs yet. Add yours above, or insert via Supabase SQL (see migration
                  20260528000020).
                </p>
              ) : (
                (config.userPermissions || []).map((up) => (
                  <div
                    key={up.discord_user_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800/90 bg-[#0d0d11] px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-semibold text-zinc-200">
                        {up.label || up.discord_user_id}
                      </div>
                      <div className="font-mono text-xs text-zinc-500">{up.discord_user_id}</div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Remove full_admin override for ${up.label || up.discord_user_id}?`,
                          )
                        ) {
                          return
                        }
                        setBusy(true)
                        try {
                          const next = await deleteUserPermission(code, up.discord_user_id)
                          setConfig(next)
                        } catch (err) {
                          setError(err.message || 'Could not remove owner account')
                        } finally {
                          setBusy(false)
                        }
                      }}
                      className="h-8 rounded bg-red-500/20 px-2 text-xs font-medium text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </SubCard>

          <div className="mt-4">
          <SubCard
            title="Add or update role mapping"
            description="Map Discord roles to permission levels, then tune feature access below."
          >
          <div className="grid gap-3 sm:grid-cols-3">
            <DiscordEntitySelect
              label="Discord role"
              value={newRolePerm.discord_role_id}
              onChange={(v) => setNewRolePerm((p) => ({ ...p, discord_role_id: v }))}
              options={config.discordCache.filter((e) => e.entity_type === 'role')}
              placeholder="Select role"
            />
            <Field
              label="Label"
              value={newRolePerm.label}
              onChange={(v) => setNewRolePerm((p) => ({ ...p, label: v }))}
            />
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Permission level
              </span>
              <select
                className={UI_SELECT}
                value={newRolePerm.permission_level}
                onChange={(e) =>
                  setNewRolePerm((p) => ({ ...p, permission_level: e.target.value }))
                }
              >
                <option value="full_admin">full_admin</option>
                <option value="moderator">moderator</option>
                <option value="member">member</option>
              </select>
            </label>
            <div className="sm:col-span-3">
              <button
                type="button"
                disabled={!newRolePerm.discord_role_id || busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    const next = await upsertRolePermission(code, {
                      discord_role_id: newRolePerm.discord_role_id,
                      label: newRolePerm.label || newRolePerm.discord_role_id,
                      permission_level: newRolePerm.permission_level,
                      is_active: true,
                      bot_feature_access: {},
                    })
                    setConfig(next)
                    setNewRolePerm({ discord_role_id: '', label: '', permission_level: 'moderator' })
                  } catch (err) {
                    setError(err.message || 'Could not add role permission')
                  } finally {
                    setBusy(false)
                  }
                }}
                className={UI_BUTTON_PRIMARY}
              >
                <Plus className="size-4" />
                Add / update mapping
              </button>
            </div>
          </div>
          </SubCard>
          </div>

          <div className="mt-4 space-y-3">
            {(config.rolePermissions || []).length === 0 ? (
              <SubCard title="No roles mapped">
                <p className="text-sm text-zinc-500">
                  Add a Discord role above to control moderator access and bot features.
                </p>
              </SubCard>
            ) : (
              (config.rolePermissions || []).map((rp) => {
                const roleEntity = (config.discordCache || []).find(
                  (e) => e.entity_type === 'role' && e.entity_id === rp.discord_role_id,
                )
                const isExpanded = expandedRolePermissionId === rp.discord_role_id
                const roleTitle = rp.label || roleEntity?.name || rp.discord_role_id
                return (
                  <SubCard
                    key={rp.discord_role_id}
                    title={roleTitle}
                    description={`Role ID ${rp.discord_role_id}`}
                    actions={
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-zinc-700/80 bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                          {rp.permission_level}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRolePermissionId(isExpanded ? null : rp.discord_role_id)
                          }
                          className={`${UI_BUTTON_SECONDARY} h-8 px-2 text-xs`}
                        >
                          {isExpanded ? 'Collapse' : 'Edit access'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            deleteRolePermission(code, rp.discord_role_id)
                              .then(setConfig)
                              .catch((err) => setError(err.message))
                          }
                          className="h-8 rounded-lg bg-red-500/15 px-2.5 text-xs font-medium text-red-300 transition hover:bg-red-500/25"
                        >
                          Remove
                        </button>
                      </div>
                    }
                  >
                    {isExpanded ? (
                      <div className="space-y-4">
                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Permission level
                          </span>
                          <select
                            className={UI_SELECT}
                            value={rp.permission_level}
                            onChange={(e) =>
                              upsertRolePermission(code, {
                                discord_role_id: rp.discord_role_id,
                                label: rp.label,
                                permission_level: e.target.value,
                                is_active: rp.is_active !== false,
                                bot_feature_access: rp.bot_feature_access || {},
                              })
                                .then(setConfig)
                                .catch((err) => setError(err.message))
                            }
                          >
                            <option value="full_admin">full_admin</option>
                            <option value="moderator">moderator</option>
                            <option value="member">member</option>
                          </select>
                        </label>

                        {rp.permission_level === 'full_admin' ? (
                          <p className="rounded-xl border border-zinc-800/80 bg-[#0d0d11] px-3 py-2 text-xs text-zinc-400">
                            Full admin always has access to all bot admin features, including
                            moderation log configuration.
                          </p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {[
                              ['credentials', 'Credentials'],
                              ['server', 'Server'],
                              ['panels', 'Panels'],
                              ['qotd', 'QOTD'],
                              ['session_logs', 'Session logs'],
                              ['mod_logs_view', 'Mod logs view'],
                            ].map(([key, label]) => (
                              <ToggleField
                                key={key}
                                label={label}
                                checked={Boolean((rp.bot_feature_access || {})[key])}
                                onChange={(next) => {
                                  const updated = {
                                    ...(rp.bot_feature_access || {}),
                                    [key]: next,
                                  }
                                  upsertRolePermission(code, {
                                    discord_role_id: rp.discord_role_id,
                                    label: rp.label,
                                    permission_level: rp.permission_level,
                                    is_active: rp.is_active !== false,
                                    bot_feature_access: updated,
                                  })
                                    .then(setConfig)
                                    .catch((err) => setError(err.message))
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Expand to edit permission level and feature access for this role.
                      </p>
                    )}
                  </SubCard>
                )
              })
            )}
          </div>
        </SectionShell>
      )}
    </div>
  )
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function formatDuration(seconds) {
  const n = Math.max(0, Number(seconds || 0))
  const h = Math.floor(n / 3600)
  const m = Math.floor((n % 3600) / 60)
  const s = n % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function SettingsActions({ isDirty, busy, onReset, onSave }) {
  return (
    <div className="mt-8 flex justify-end gap-2 border-t border-zinc-800/80 pt-6">
      <button
        type="button"
        onClick={onReset}
        disabled={!isDirty || busy}
        className={UI_BUTTON_SECONDARY}
      >
        Reset
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={!isDirty || busy}
        className={UI_BUTTON_PRIMARY}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Save settings
      </button>
    </div>
  )
}

function Field({ label, hint, value, onChange, placeholder }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      <input
        type="text"
        className={UI_INPUT}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
    </label>
  )
}

function SecretField({ label, value, onChange, placeholder }) {
  const isMasked = value === SECRET_PLACEHOLDER
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      <input
        type="password"
        autoComplete="off"
        className={UI_INPUT}
        value={isMasked ? '' : value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-zinc-800/90 bg-[#14141a] px-3 py-2.5">
      <span className="text-sm text-zinc-300">{label}</span>
      <AdminSwitch
        checked={checked}
        onChange={onChange}
        aria-label={label}
      />
    </label>
  )
}
