import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  FlaskConical,
  UserPlus,
} from 'lucide-react'
import AdminSwitch from '@/components/admin/AdminSwitch'
import BotMessageEditor from '@/components/admin/BotMessageEditor'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb'
import AdminFeatureRow from '@/components/admin/AdminFeatureRow'
import AdminHubCategory, { AdminHubCategories } from '@/components/admin/AdminHubCategory'
import AdminSelect from '@/components/admin/AdminSelect'
import {
  ADMIN_SETUP_INCOMPLETE,
  BOT_HUB_INTRO,
  BOT_PAGE_INTRO,
  BOT_SETTINGS_SAVED_SUCCESS,
  CREDENTIALS_INTRO,
} from '@/components/admin/adminCopy'
import AdminSettingsRow from '@/components/admin/AdminSettingsRow'
import CollapsibleSection from '@/components/admin/CollapsibleSection'
import ModLogEmbedEditor from '@/components/admin/ModLogEmbedEditor'
import WelcomeGoodbyeEmbedEditor from '@/components/admin/WelcomeGoodbyeEmbedEditor'
import ModLogsViewer from '@/components/admin/ModLogsViewer'
import PanelTemplatePicker from '@/components/admin/PanelTemplatePicker'
import DiscordEntitySelect from '@/components/admin/DiscordEntitySelect'
import {
  channelNameMapFromDiscordCache,
  channelsFromCache,
  rolesFromCache,
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
  parseWelcomeGoodbyeEmbedsFromSettings,
  WELCOME_GOODBYE_EMBED_TEMPLATES,
  welcomeGoodbyeEmbedsEqual,
  welcomeGoodbyeEmbedsToSettingsPayload,
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
  getStoredAdminCode,
} from '@/services/skzAdmin'
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCalloutError,
  adminCalloutInfo,
  adminCalloutWarn,
  adminDebugPanel,
  adminDebugPanelActions,
  adminDebugPanelGroupLabel,
  adminDebugPanelIntro,
  adminControl,
  adminControlTextarea,
  adminCollapsible,
  adminFeatureList,
  adminHubGrid,
  adminHubMain,
  adminInset,
  adminListRow,
  adminModal,
  adminModalNarrow,
  adminModalWide,
  adminPanel,
  adminSubsection,
  adminStack,
  adminSubsectionHead,
  adminTableWrap,
  adminToggleRow,
} from '@/components/admin/adminUi'

const MIGRATION_HINT = ADMIN_SETUP_INCOMPLETE

const UI_INPUT = adminControl
const UI_TEXTAREA = adminControlTextarea
const UI_SELECT = adminControl
const UI_BUTTON_SECONDARY = adminBtnSecondary
const UI_BUTTON_PRIMARY = adminBtnPrimary

function isMigrationError(message) {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes('skz_admin_bot_') || m.includes('skz_bot_')
}

/** @typedef {'hub' | 'credentials' | 'server' | 'panels' | 'logs' | 'permissions' | 'mod_config' | 'mod_logs' | 'welcome_goodbye'} BotSection */

function SectionShell({ children }) {
  return <div className={adminPanel}>{children}</div>
}

function SubCard({
  title,
  description,
  actions = null,
  children,
  collapsible = false,
  defaultOpen = false,
  open,
  onOpenChange,
  badge = null,
  switch: headerSwitch = null,
}) {
  if (collapsible && title) {
    return (
      <CollapsibleSection
        title={title}
        subtitle={description}
        badge={badge}
        defaultOpen={defaultOpen}
        open={open}
        onOpenChange={onOpenChange}
        actions={actions}
        switch={headerSwitch}
      >
        {children}
      </CollapsibleSection>
    )
  }

  return (
    <section className={adminSubsection}>
      {(title || description || actions) && (
        <div className={adminSubsectionHead}>
          <div>
            {title ? <h4>{title}</h4> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

function AdminDataTable({ columns, rows, emptyMessage, loading }) {
  return (
    <div className={adminTableWrap}>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
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
  const navigate = useNavigate()
  const {
    isFullAdmin,
    isRealFullAdmin,
    featureAccess,
    previewReadOnly,
    moderatorOnlyView,
  } = useAdminAccess()
  const code = getStoredAdminCode()
  const hasStaffCode = Boolean(code?.trim())
  const moderatorOnly = moderatorOnlyView
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
  const [welcomeGoodbyeEmbedTab, setWelcomeGoodbyeEmbedTab] = useState('welcome')
  const [welcomeGoodbyeEmbeds, setWelcomeGoodbyeEmbeds] = useState(() =>
    parseWelcomeGoodbyeEmbedsFromSettings(SETTING_DEFAULTS),
  )
  const [savedWelcomeGoodbyeEmbeds, setSavedWelcomeGoodbyeEmbeds] = useState(() =>
    parseWelcomeGoodbyeEmbedsFromSettings(SETTING_DEFAULTS),
  )

  const canModLogsConfig = isFullAdmin && featureAccess.mod_logs_config !== false
  const canWelcomeGoodbye = isFullAdmin && featureAccess.welcome_goodbye !== false
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
        const greetingEmbeds = parseWelcomeGoodbyeEmbedsFromSettings(data.settings)
        setWelcomeGoodbyeEmbeds(greetingEmbeds)
        setSavedWelcomeGoodbyeEmbeds(greetingEmbeds)
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

  const welcomeGoodbyeEmbedsDirty = useMemo(
    () => !welcomeGoodbyeEmbedsEqual(welcomeGoodbyeEmbeds, savedWelcomeGoodbyeEmbeds),
    [welcomeGoodbyeEmbeds, savedWelcomeGoodbyeEmbeds],
  )

  const isDirty = useMemo(() => {
    if (!draft || !config.settings) return false
    const settingsDirty = Object.keys(draft).some((k) => draft[k] !== config.settings[k])
    return settingsDirty || modLogEmbedsDirty || welcomeGoodbyeEmbedsDirty
  }, [draft, config.settings, modLogEmbedsDirty, welcomeGoodbyeEmbedsDirty])

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
        ...welcomeGoodbyeEmbedsToSettingsPayload(welcomeGoodbyeEmbeds),
      })
      setConfig(next)
      setDraft(next.settings)
      const embeds = parseModLogEmbedsFromSettings(next.settings)
      setModLogEmbeds(embeds)
      setSavedModLogEmbeds(embeds)
      const greetingEmbeds = parseWelcomeGoodbyeEmbedsFromSettings(next.settings)
      setWelcomeGoodbyeEmbeds(greetingEmbeds)
      setSavedWelcomeGoodbyeEmbeds(greetingEmbeds)
      setMessage(BOT_SETTINGS_SAVED_SUCCESS)
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
    if (section === 'welcome_goodbye') {
      return [root, { key: 'welcome_goodbye', label: 'Welcome & goodbye' }]
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
        'Guild ID is the source of truth — changing it here updates bot settings on save. Run Sync Discord dropdowns after setting a guild ID.',
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
      <div className={`${adminPanel} text-sm text-zinc-400`}>
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
              : BOT_PAGE_INTRO}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSyncDiscord}
            disabled={previewReadOnly || busy || !draft?.guild_id}
            className={UI_BUTTON_SECONDARY}
          >
            Sync Discord dropdowns
          </button>
          <button
            type="button"
            onClick={load}
            disabled={previewReadOnly}
            className={UI_BUTTON_SECONDARY}
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <p className={adminCalloutInfo}>
          {message}
        </p>
      )}
      {error && (
        <p className={adminCalloutError}>
          {error}
        </p>
      )}
      {showHint && (
        <p className={adminCalloutWarn}>
          <span className="font-semibold">Setup required: </span>
          {MIGRATION_HINT}
        </p>
      )}

      {section === 'hub' && (
        <SectionShell>
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-xl font-bold tracking-tight text-white">Bot settings</h3>
              <p className="mt-1 max-w-2xl text-sm text-zinc-500">{BOT_HUB_INTRO}</p>
            </div>
            {isRealFullAdmin && draft && !previewReadOnly && (
              <SettingsActions
                placement="top"
                isDirty={isDirty}
                busy={busy}
                readOnly={previewReadOnly}
                onReset={() => setDraft(config.settings)}
                onSave={handleSaveSettings}
              />
            )}
          </div>
          <div className={adminHubMain}>
            <div className={adminHubGrid}>
              {canPanels && (
                <AdminFeatureRow
                  layout="card"
                  icon={LayoutGrid}
                  iconBg="bg-violet-500/15 text-violet-400"
                  title="Reaction panels"
                  description="Verify gates, role menus, and announcement embeds."
                  meta={
                    config.messages.length
                      ? `${config.messages.length} panel${config.messages.length === 1 ? '' : 's'} · ${livePanelCount} live`
                      : 'None yet'
                  }
                  onOpen={() => goSection('panels')}
                />
              )}
              {isRealFullAdmin && canQotd && draft && (
                <AdminFeatureRow
                  layout="card"
                  icon={ListOrdered}
                  iconBg="bg-sky-500/15 text-sky-400"
                  title="Question of the day"
                  description="Daily thread schedule and question bank."
                  meta={
                    String(draft.qotd_enabled || 'false').toLowerCase() === 'true'
                      ? 'Enabled'
                      : 'Disabled'
                  }
                  switch={
                    previewReadOnly
                      ? undefined
                      : {
                          checked: String(draft.qotd_enabled || 'false').toLowerCase() === 'true',
                          onChange: (next) => setField('qotd_enabled', next ? 'true' : 'false'),
                          ariaLabel: 'Enable question of the day',
                        }
                  }
                  onOpen={() => {
                    goSection('server')
                    openQotdSubsection('hub')
                  }}
                />
              )}
              {isRealFullAdmin && canModLogsConfig && draft && (
                <AdminFeatureRow
                  layout="card"
                  icon={Shield}
                  iconBg="bg-rose-500/15 text-rose-400"
                  title="Moderation logging"
                  description="Join logs, message edits/deletes, and log channels."
                  meta={draft.mod_log_enabled === 'true' ? 'Enabled' : 'Disabled'}
                  switch={
                    previewReadOnly
                      ? undefined
                      : {
                          checked: draft.mod_log_enabled === 'true',
                          onChange: (next) =>
                            setDraft((p) => ({ ...p, mod_log_enabled: next ? 'true' : 'false' })),
                          ariaLabel: 'Enable moderation logging',
                        }
                  }
                  onOpen={() => goSection('mod_config')}
                />
              )}
              {isRealFullAdmin && canWelcomeGoodbye && draft && (
                <AdminFeatureRow
                  layout="card"
                  icon={UserPlus}
                  iconBg="bg-emerald-500/15 text-emerald-400"
                  title="Welcome & goodbye"
                  description="Custom embeds when members join or leave (separate from mod logs)."
                  meta={
                    draft.welcome_enabled === 'true' || draft.goodbye_enabled === 'true'
                      ? 'Enabled'
                      : 'Disabled'
                  }
                  switch={
                    previewReadOnly
                      ? undefined
                      : {
                          checked:
                            draft.welcome_enabled === 'true' ||
                            draft.goodbye_enabled === 'true',
                          onChange: (next) =>
                            setDraft((p) => ({
                              ...p,
                              welcome_enabled: next ? 'true' : 'false',
                              goodbye_enabled: next ? 'true' : 'false',
                            })),
                          ariaLabel: 'Enable welcome and goodbye messages',
                        }
                  }
                  onOpen={() => goSection('welcome_goodbye')}
                />
              )}
              {canModLogsView && (
                <AdminFeatureRow
                  layout="card"
                  icon={ScrollText}
                  iconBg="bg-orange-500/15 text-orange-400"
                  title="Moderation logs"
                  description="Browse join, edit, and delete events recorded by the bot."
                  meta="View history"
                  onOpen={() => {
                    goSection('mod_logs')
                    loadModLogs()
                  }}
                />
              )}
              {canRolePermissions && (
                <AdminFeatureRow
                  layout="card"
                  icon={Bot}
                  iconBg="bg-fuchsia-500/15 text-fuchsia-400"
                  title="Role permissions"
                  description="Map Discord roles to permission levels and bot feature access."
                  meta={`${(config.rolePermissions || []).length} mapped`}
                  onOpen={() => goSection('permissions')}
                />
              )}
              {canSessionLogs && (
                <AdminFeatureRow
                  layout="card"
                  icon={Clock3}
                  iconBg="bg-sky-500/15 text-sky-400"
                  title="Session logs"
                  description="Who signed in, Discord IDs, durations, and session status."
                  meta={`${sessionLogs.length || 0} recent`}
                  onOpen={() => {
                    goSection('logs')
                    loadSessionLogs()
                  }}
                />
              )}
            </div>
          </div>

          <AdminHubCategories>
            <AdminHubCategory title="Configuration">
              {canCredentials && (
                <AdminFeatureRow
                  layout="card"
                  icon={KeyRound}
                  iconBg="bg-amber-500/15 text-amber-400"
                  title="Credentials"
                  description="Discord token, client ID, and database keys."
                  meta={credentialsReady ? 'Configured' : 'Needs setup'}
                  onOpen={() => goSection('credentials')}
                />
              )}
              {canServer && (
                <AdminFeatureRow
                  layout="card"
                  icon={Server}
                  iconBg="bg-emerald-500/15 text-emerald-400"
                  title="Server"
                  description="Guild ID, voice hub, and personal VC naming."
                  meta={draft?.guild_id ? 'Guild linked' : 'No guild ID'}
                  onOpen={() => goSection('server')}
                />
              )}
            </AdminHubCategory>

            <AdminHubCategory title="Misc">
              {isRealFullAdmin && (
                <AdminFeatureRow
                  layout="card"
                  icon={FlaskConical}
                  iconBg="bg-indigo-500/15 text-indigo-400"
                  title="Developer tools"
                  description="Preview the panel as another role."
                  meta="Role preview"
                  onOpen={() => navigate('/admin/developer')}
                />
              )}
            </AdminHubCategory>
          </AdminHubCategories>
          {![
            canPanels,
            isRealFullAdmin && canQotd,
            isRealFullAdmin && canModLogsConfig,
            canCredentials,
            canServer,
            canSessionLogs,
            canRolePermissions,
            canModLogsView,
            isRealFullAdmin,
          ].some(Boolean) && (
            <p className={adminCalloutWarn}>
              This role would not see any Discord bot admin sections. Adjust role permissions or
              pick another preview target in Developer tools.
            </p>
          )}
        </SectionShell>
      )}

      {section === 'credentials' && canCredentials && (
        <SectionShell>
          <AdminBreadcrumb items={breadcrumbItems} />
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight text-white">Credentials</h3>
            <p className="mt-1 text-sm text-zinc-500">{CREDENTIALS_INTRO}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                label="Site URL"
                hint="Public origin with no trailing slash. Player OAuth redirects use {site_url}/api/player/auth/discord/callback — add that URL in Discord → OAuth2 → Redirects."
                value={draft.site_url ?? ''}
                onChange={(v) => setDraft((p) => ({ ...p, site_url: v.replace(/\/$/, '') }))}
                placeholder="https://skzarcade.com"
              />
            </div>
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
              label="Discord client secret"
              value={draft.discord_client_secret}
              onChange={(v) => setSecretField('discord_client_secret', v)}
              placeholder={
                draft.discord_client_secret === SECRET_PLACEHOLDER
                  ? '•••••••• (saved — type to replace)'
                  : 'OAuth2 client secret (player Continue with Discord)'
              }
            />
            <SecretField
              label="Database project URL"
              value={draft.supabase_url}
              onChange={(v) => setSecretField('supabase_url', v)}
              placeholder={
                draft.supabase_url === SECRET_PLACEHOLDER
                  ? '•••••••• (saved)'
                  : 'https://xxx.supabase.co'
              }
            />
            <SecretField
              label="Database service role key"
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
            readOnly={previewReadOnly}
            onReset={() => setDraft(config.settings)}
            onSave={handleSaveSettings}
          />
        </SectionShell>
      )}

      {section === 'server' && canServer && (
        <SectionShell>
          <AdminBreadcrumb items={breadcrumbItems} />
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight text-white">{serverPageHeader.title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{serverPageHeader.description}</p>
          </div>
          {serverSubsection === 'hub' && (
            <div className={adminFeatureList}>
              <AdminFeatureRow
                icon={Server}
                iconBg="bg-emerald-500/15 text-emerald-400"
                title="Guild settings"
                description="Guild identity and base server linkage for bot configuration."
                meta={draft.guild_id ? 'Guild linked' : 'Needs guild ID'}
                onOpen={() => setServerSubsection('guild')}
              />
              <AdminFeatureRow
                icon={Bot}
                iconBg="bg-sky-500/15 text-sky-400"
                title="Join-to-create voice hub"
                description="Hub channel, personal VC category, and naming pattern."
                meta={draft.join_to_create_channel_id ? 'Configured' : 'Not configured'}
                onOpen={() => setServerSubsection('voice')}
              />
              {canQotd && (
                <AdminFeatureRow
                  icon={Clock3}
                  iconBg="bg-violet-500/15 text-violet-400"
                  title="Question of the day"
                  description="Schedule, target channel, thread format, and question bank."
                  meta={
                    String(draft.qotd_enabled || 'false').toLowerCase() === 'true'
                      ? 'Enabled'
                      : 'Disabled'
                  }
                  switch={
                    isFullAdmin
                      ? {
                          checked:
                            String(draft.qotd_enabled || 'false').toLowerCase() === 'true',
                          onChange: (next) =>
                            setField('qotd_enabled', next ? 'true' : 'false'),
                          ariaLabel: 'Enable question of the day',
                        }
                      : undefined
                  }
                  onOpen={() => openQotdSubsection('hub')}
                />
              )}
            </div>
          )}
          {serverSubsection === 'hub' && isFullAdmin && (
            <SettingsActions
              isDirty={isDirty}
              busy={busy}
              readOnly={previewReadOnly}
              onReset={() => setDraft(config.settings)}
              onSave={handleSaveSettings}
            />
          )}

          {serverSubsection === 'guild' && (
            <>
              <div className="mb-3 admin-inset text-xs text-zinc-400">
                Server / Guild settings
              </div>
              <SubCard
                collapsible
                defaultOpen
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
                readOnly={previewReadOnly}
                onReset={() => setDraft(config.settings)}
                onSave={handleSaveSettings}
              />
            </>
          )}

          {serverSubsection === 'voice' && (
            <>
              <div className="mb-3 admin-inset text-xs text-zinc-400">
                Server / Join-to-create voice hub
              </div>
              <SubCard
                collapsible
                defaultOpen
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
                readOnly={previewReadOnly}
                onReset={() => setDraft(config.settings)}
                onSave={handleSaveSettings}
              />
            </>
          )}

          {serverSubsection === 'qotd' && canQotd && (
            <>
              {qotdSubsection === 'hub' && (
                <div className={adminFeatureList}>
                  <AdminFeatureRow
                    icon={Clock3}
                    iconBg="bg-violet-500/15 text-violet-400"
                    title="Schedule"
                    description="Enable QOTD, channel, ping role, daily UTC time, and thread name."
                    meta={
                      String(draft.qotd_enabled || 'false').toLowerCase() === 'true'
                        ? 'Enabled'
                        : 'Disabled'
                    }
                    switch={
                      isFullAdmin
                        ? {
                            checked:
                              String(draft.qotd_enabled || 'false').toLowerCase() === 'true',
                            onChange: (next) =>
                              setField('qotd_enabled', next ? 'true' : 'false'),
                            ariaLabel: 'Enable question of the day',
                          }
                        : undefined
                    }
                    onOpen={() => openQotdSubsection('schedule')}
                  />
                  <AdminFeatureRow
                    icon={ListOrdered}
                    iconBg="bg-sky-500/15 text-sky-400"
                    title="Daily questions"
                    description="Banks per type — QOTD daily, bonuses on set weekdays."
                    meta={`${(config.dailyQuestions || []).length} question${(config.dailyQuestions || []).length === 1 ? '' : 's'}`}
                    onOpen={() => openQotdSubsection('questions')}
                  />
                </div>
              )}

              {qotdSubsection === 'schedule' && (
                <>
                  <div className={adminStack}>
                  <SubCard
                    collapsible
                    defaultOpen
                    title="Schedule"
                    description="Control where and when the daily thread is posted."
                    switch={{
                      checked: String(draft.qotd_enabled || 'false').toLowerCase() === 'true',
                      onChange: (next) => setField('qotd_enabled', next ? 'true' : 'false'),
                      ariaLabel: 'Enable question of the day',
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <DiscordEntitySelect
                          label="QOTD target channel"
                        value={draft.qotd_channel_id}
                        onChange={(v) => setField('qotd_channel_id', v)}
                          options={channelsFromCache(config.discordCache, 'text')}
                          placeholder="Select channel..."
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <DiscordEntitySelect
                          label="Ping role (optional)"
                          hint="Members with this role are notified when a QOTD or bonus question posts. Sync Discord dropdowns after creating a new role. The role must be mentionable in Discord."
                          value={draft.qotd_ping_role_id}
                          onChange={(v) => setField('qotd_ping_role_id', v)}
                          options={rolesFromCache(config.discordCache)}
                          placeholder="No role ping"
                          allowEmpty
                        />
                      </div>
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

                  <SubCard
                    collapsible
                    title="Scheduler debug"
                    description="Probe posting, locks, and timing — not for everyday config."
                    badge="Dev"
                  >
                    <div className={adminDebugPanel}>
                      <p className={adminCalloutWarn}>
                        Use after saving schedule settings. These actions can post to Discord or
                        change scheduler state immediately.
                      </p>
                      <p className={adminDebugPanelIntro}>
                        Typical flow: enable QOTD and save → set next minute and save → reset
                        today&apos;s lock if needed → run scheduler check when the UTC clock matches,
                        or run now to skip the schedule.
                      </p>
                      <div>
                        <p className={adminDebugPanelGroupLabel}>Timing</p>
                        <div className={adminDebugPanelActions}>
                          <button
                            type="button"
                            onClick={setQotdToNextUtcMinute}
                            className={`${UI_BUTTON_SECONDARY} h-8 px-2.5 text-xs`}
                          >
                            Set next minute (UTC)
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={runQotdSchedulerTest}
                            className={`${UI_BUTTON_SECONDARY} h-8 px-2.5 text-xs`}
                          >
                            Run scheduler check
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className={adminDebugPanelGroupLabel}>Locks &amp; overrides</p>
                        <div className={adminDebugPanelActions}>
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
                            onClick={runDailyQuestionNow}
                            className="inline-flex h-8 items-center rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            Run now (bypass schedule)
                          </button>
                        </div>
                      </div>
                    </div>
                  </SubCard>
                  </div>
                  <SettingsActions
                    isDirty={isDirty}
                    busy={busy}
                    readOnly={previewReadOnly}
                    onReset={() => setDraft(config.settings)}
                    onSave={handleSaveSettings}
                  />
                </>
              )}

              {qotdSubsection === 'questions' && (
                <div className={adminCollapsible}>
                  <div className="px-5 pt-4">
                    <p className="text-sm text-zinc-500">
                      Question of the day posts every day (time on Schedule). Bonus types post on
                      their own UTC weekday and time — separate from the main QOTD.
                    </p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Question bank
                    </p>
                    <div
                      className="mt-2 grid grid-cols-1 gap-1.5 admin-inset p-1.5 sm:grid-cols-3"
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
                    className="mt-4 border-t border-white/[0.06] px-5 py-4"
                    role="tabpanel"
                  >
                    <h3 className="text-base font-semibold text-zinc-100">
                      {activeQotdTypeMeta?.label}
                    </h3>
                    {dailyQuestionsTab !== 'standard' && activeBonusSchedule && (
                      <div className="mb-4 mt-3 admin-inset p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Schedule (UTC)
                        </p>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          <label className="block space-y-1">
                            <span className="text-xs text-zinc-500">Post day</span>
                            <AdminSelect
                              value={
                                draft[activeBonusSchedule.day] ?? activeBonusSchedule.defaultDay
                              }
                              onChange={(e) =>
                                setField(activeBonusSchedule.day, e.target.value)
                              }
                            >
                              {QOTD_WEEKDAYS_UTC.map((d) => (
                                <option key={d.value} value={d.value}>
                                  {d.label}
                                </option>
                              ))}
                            </AdminSelect>
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
                      <p className="admin-inset px-3 py-4 text-xs text-zinc-500">
                        No {activeQotdTypeMeta?.label?.toLowerCase() ?? 'questions'} yet.
                      </p>
                    ) : (
                      <div className={adminTableWrap}>
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
                            <tbody>
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
                        readOnly={previewReadOnly}
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
          <div className={adminModalWide}>
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
          <div className={adminModalWide}>
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
          <div className={adminModalNarrow}>
            <h4 className="text-base font-semibold text-zinc-100">Delete daily question?</h4>
            <p className="mt-2 text-sm text-zinc-400">
              This will permanently remove this question from the QOTD bank.
            </p>
            <p className={`mt-2 truncate ${adminInset} text-sm text-zinc-200`}>
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
          <AdminBreadcrumb items={breadcrumbItems} />
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight text-white">Reaction panels</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Verify gates, role menus, and announcements.
            </p>
          </div>
          <div className={adminFeatureList}>
            {config.messages.map((m) => (
              <AdminFeatureRow
                key={m.id}
                title={m.label || m.slug}
                description={m.kind?.replace('_', ' ') || 'Panel'}
                meta={m.discord_message_id ? 'Live on Discord' : 'Draft'}
                onOpen={() => openPanel(m)}
              />
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
          <AdminBreadcrumb items={breadcrumbItems} />
          <PanelTemplatePicker
            onSelect={(t) => {
              openNewPanel(t)
            }}
          />
        </>
      )}

      {section === 'panels' && canPanels && editingPanel && (
        <>
          <AdminBreadcrumb items={breadcrumbItems} />
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
          <AdminBreadcrumb items={breadcrumbItems} />
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
          <div className={adminStack}>
            <SubCard
              collapsible
              defaultOpen
              title="Moderation logging"
              description="Turn all join and message logging on or off."
              switch={{
                checked: draft.mod_log_enabled === 'true',
                onChange: (next) =>
                  setDraft((p) => ({ ...p, mod_log_enabled: next ? 'true' : 'false' })),
                ariaLabel: 'Enable moderation logging',
              }}
            >
              <p className="text-xs text-zinc-500">
                When disabled, the bot stops posting moderation embeds until you turn this back on.
              </p>
            </SubCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <SubCard
                collapsible
                title="Member events"
                description="Join logs and /info lookups post here."
                switch={{
                  checked: draft.mod_log_member_join === 'true',
                  onChange: (next) =>
                    setDraft((p) => ({ ...p, mod_log_member_join: next ? 'true' : 'false' })),
                  ariaLabel: 'Log member joins',
                }}
              >
                <DiscordEntitySelect
                  label="Join / account log channel"
                  value={draft.mod_log_join_channel_id}
                  onChange={(v) => setDraft((p) => ({ ...p, mod_log_join_channel_id: v }))}
                  options={channelsFromCache(config.discordCache, 'text')}
                  placeholder="Select channel"
                />
              </SubCard>
              <SubCard
                collapsible
                title="Message events"
                description="Edits, single deletes, and bulk deletes post here."
                badge={`${[
                  draft.mod_log_message_edits,
                  draft.mod_log_message_deletes,
                  draft.mod_log_message_bulk_deletes,
                ].filter((v) => v === 'true').length} on`}
              >
                <DiscordEntitySelect
                  label="Message log channel"
                  value={draft.mod_log_message_channel_id}
                  onChange={(v) => setDraft((p) => ({ ...p, mod_log_message_channel_id: v }))}
                  options={channelsFromCache(config.discordCache, 'text')}
                  placeholder="Select channel"
                />
                <div className="mt-3 divide-y divide-white/[0.06]">
                  <AdminSettingsRow
                    title="Log message edits"
                    checked={draft.mod_log_message_edits === 'true'}
                    onChange={(next) =>
                      setDraft((p) => ({
                        ...p,
                        mod_log_message_edits: next ? 'true' : 'false',
                      }))
                    }
                  />
                  <AdminSettingsRow
                    title="Log message deletes"
                    checked={draft.mod_log_message_deletes === 'true'}
                    onChange={(next) =>
                      setDraft((p) => ({
                        ...p,
                        mod_log_message_deletes: next ? 'true' : 'false',
                      }))
                    }
                  />
                  <AdminSettingsRow
                    title="Log bulk deletes"
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

            <SubCard
              collapsible
              title="Log embed appearance"
              description="Customize Discord embeds for each log type — same structure as reaction panels. Placeholders are filled when the bot posts."
            >
              <div
                className="mb-4 flex justify-center admin-inset p-2"
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
            readOnly={previewReadOnly}
            onReset={() => {
              setDraft(config.settings)
              setModLogEmbeds(savedModLogEmbeds)
            }}
            onSave={handleSaveSettings}
          />
        </SectionShell>
      )}

      {section === 'welcome_goodbye' && canWelcomeGoodbye && draft && (
        <SectionShell>
          <AdminBreadcrumb items={breadcrumbItems} />
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight text-white">Welcome & goodbye</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Full-admin only. Post styled embeds when members join or leave. Bots are skipped.
              This is separate from moderation join logs — both can run if both are enabled.
            </p>
          </div>
          <div className={adminStack}>
            <div className="grid gap-4 lg:grid-cols-2">
              <SubCard
                collapsible
                defaultOpen
                title="Welcome"
                description="Posted when a non-bot member joins."
                switch={{
                  checked: draft.welcome_enabled === 'true',
                  onChange: (next) =>
                    setDraft((p) => ({ ...p, welcome_enabled: next ? 'true' : 'false' })),
                  ariaLabel: 'Enable welcome messages',
                }}
              >
                <DiscordEntitySelect
                  label="Welcome channel"
                  value={draft.welcome_channel_id}
                  onChange={(v) => setDraft((p) => ({ ...p, welcome_channel_id: v }))}
                  options={channelsFromCache(config.discordCache, 'text')}
                  placeholder="Select channel"
                />
              </SubCard>
              <SubCard
                collapsible
                defaultOpen
                title="Goodbye"
                description="Posted when a member leaves the server."
                switch={{
                  checked: draft.goodbye_enabled === 'true',
                  onChange: (next) =>
                    setDraft((p) => ({ ...p, goodbye_enabled: next ? 'true' : 'false' })),
                  ariaLabel: 'Enable goodbye messages',
                }}
              >
                <DiscordEntitySelect
                  label="Goodbye channel"
                  value={draft.goodbye_channel_id}
                  onChange={(v) => setDraft((p) => ({ ...p, goodbye_channel_id: v }))}
                  options={channelsFromCache(config.discordCache, 'text')}
                  placeholder="Select channel"
                />
              </SubCard>
            </div>

            <SubCard
              collapsible
              title="Embed appearance"
              description="Customize welcome and goodbye embeds — same editor as moderation logs. Placeholders are filled when the bot posts."
            >
              <div
                className="mb-4 flex justify-center admin-inset p-2"
                role="tablist"
                aria-label="Welcome and goodbye embed templates"
              >
                <div className="inline-flex flex-wrap items-center justify-center gap-1.5">
                  {WELCOME_GOODBYE_EMBED_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={welcomeGoodbyeEmbedTab === t.id}
                      onClick={() => setWelcomeGoodbyeEmbedTab(t.id)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-center text-sm whitespace-nowrap transition ${
                        welcomeGoodbyeEmbedTab === t.id
                          ? 'bg-emerald-500/20 font-semibold text-emerald-100 ring-1 ring-emerald-500/40'
                          : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {WELCOME_GOODBYE_EMBED_TEMPLATES.filter((t) => t.id === welcomeGoodbyeEmbedTab).map(
                (t) => (
                  <div key={t.id}>
                    <p className="mb-4 text-sm text-zinc-500">{t.description}</p>
                    <WelcomeGoodbyeEmbedEditor
                      templateId={t.id}
                      embed={welcomeGoodbyeEmbeds[t.id]}
                      onChange={(next) =>
                        setWelcomeGoodbyeEmbeds((prev) => ({ ...prev, [t.id]: next }))
                      }
                    />
                  </div>
                ),
              )}
            </SubCard>
          </div>

          <SettingsActions
            isDirty={isDirty}
            busy={busy}
            readOnly={previewReadOnly}
            onReset={() => {
              setDraft(config.settings)
              setWelcomeGoodbyeEmbeds(savedWelcomeGoodbyeEmbeds)
            }}
            onSave={handleSaveSettings}
          />
        </SectionShell>
      )}

      {section === 'mod_logs' && canModLogsView && (
        <SectionShell>
          <AdminBreadcrumb items={breadcrumbItems} />
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white">Moderation logs</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Events the bot records in Discord. Mods need{' '}
                <strong className="font-medium text-zinc-300">Mod logs view</strong> on their
                role (Role permissions).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminSelect
                wrapperClassName="admin-select-wrap--inline w-auto min-w-[10rem]"
                size="sm"
                value={modLogEventFilter}
                onChange={(e) => setModLogEventFilter(e.target.value)}
              >
                {MOD_LOG_EVENT_TYPES.map((t) => (
                  <option key={t.value || 'all'} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </AdminSelect>
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
          <AdminBreadcrumb
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
          <AdminBreadcrumb
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
          <div className={adminStack}>
          <SubCard
            collapsible
            defaultOpen
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
                  No owner user IDs yet. Add yours above using the form.
                </p>
              ) : (
                (config.userPermissions || []).map((up) => (
                  <div
                    key={up.discord_user_id}
                    className={`${adminListRow} justify-between gap-2 py-2`}
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

          <SubCard
            collapsible
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
              <AdminSelect
                value={newRolePerm.permission_level}
                onChange={(e) =>
                  setNewRolePerm((p) => ({ ...p, permission_level: e.target.value }))
                }
              >
                <option value="full_admin">full_admin</option>
                <option value="moderator">moderator</option>
                <option value="member">member</option>
              </AdminSelect>
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

          <div className="space-y-3">
            {(config.rolePermissions || []).length === 0 ? (
              <SubCard collapsible title="No roles mapped">
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
                    collapsible
                    open={isExpanded}
                    onOpenChange={(next) =>
                      setExpandedRolePermissionId(next ? rp.discord_role_id : null)
                    }
                    title={roleTitle}
                    description={`Role ID ${rp.discord_role_id}`}
                    badge={rp.permission_level}
                    actions={
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
                    }
                  >
                      <div className="space-y-4">
                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Permission level
                          </span>
                          <AdminSelect
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
                          </AdminSelect>
                        </label>

                        {rp.permission_level === 'full_admin' ? (
                          <p className="admin-inset text-xs text-zinc-400">
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
                              <AdminSettingsRow
                                key={key}
                                title={label}
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
                  </SubCard>
                )
              })
            )}
          </div>
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

function SettingsActions({
  isDirty,
  busy,
  onReset,
  onSave,
  readOnly = false,
  placement = 'footer',
}) {
  const wrapClass =
    placement === 'top'
      ? 'flex shrink-0 flex-wrap justify-end gap-2'
      : 'admin-subsection mt-8 flex justify-end gap-2 pt-6'

  return (
    <div className={wrapClass}>
      <button
        type="button"
        onClick={onReset}
        disabled={readOnly || !isDirty || busy}
        className={UI_BUTTON_SECONDARY}
      >
        Reset
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={readOnly || !isDirty || busy}
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

function ToggleField({ label, checked, onChange, plain = false }) {
  if (plain) {
    return (
      <AdminSettingsRow title={label} checked={checked} onChange={onChange} />
    )
  }
  return (
    <label className={adminToggleRow}>
      <span className="text-sm text-zinc-300">{label}</span>
      <AdminSwitch checked={checked} onChange={onChange} aria-label={label} />
    </label>
  )
}
