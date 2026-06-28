import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  HeartPulse,
  Loader2,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react'
import { discordAvatarUrl } from '@skz/shared'
import { fetchAdminBotHealth } from '@/services/skzAdmin'
import {
  adminBtnSecondary,
  adminCalloutError,
  adminCalloutInfo,
  adminCalloutWarn,
  adminInset,
  adminSubsection,
  adminSubsectionHead,
  adminTableWrap,
} from '@/components/admin/adminUi'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function formatRelativeSeconds(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return '—'
  const n = Math.max(0, Math.round(Number(seconds)))
  if (n < 60) return `${n}s ago`
  if (n < 3600) return `${Math.floor(n / 60)}m ago`
  if (n < 86400) return `${Math.floor(n / 3600)}h ago`
  return `${Math.floor(n / 86400)}d ago`
}

function formatUptime(startedAt) {
  if (!startedAt) return '—'
  const start = new Date(startedAt)
  if (Number.isNaN(start.getTime())) return '—'
  const seconds = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${seconds}s`
}

const CONNECTION_STYLES = {
  online: {
    label: 'Online',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    badge: 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30',
    icon: CheckCircle2,
  },
  degraded: {
    label: 'Degraded',
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    badge: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
    icon: AlertTriangle,
  },
  offline: {
    label: 'Offline',
    dot: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]',
    badge: 'bg-red-500/15 text-red-200 ring-red-500/30',
    icon: AlertTriangle,
  },
}

function StatusBadge({ state }) {
  const style = CONNECTION_STYLES[state] || CONNECTION_STYLES.offline
  const Icon = style.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}
    >
      <span className={`size-2 rounded-full ${style.dot}`} aria-hidden />
      <Icon className="size-3.5" aria-hidden />
      {style.label}
    </span>
  )
}

function MetricCard({ label, value, hint, tone = 'default' }) {
  const toneClass =
    tone === 'warn'
      ? 'border-amber-500/25 bg-amber-500/5'
      : tone === 'danger'
        ? 'border-red-500/25 bg-red-500/5'
        : 'border-zinc-800/80 bg-zinc-900/40'
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  )
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-zinc-800/60 py-2 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className={`text-sm text-zinc-200 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

function FeatureFlag({ label, enabled }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        enabled
          ? 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/25'
          : 'bg-zinc-800/60 text-zinc-500 ring-zinc-700/50'
      }`}
    >
      {label}
    </span>
  )
}

function hasSection(health, key) {
  const sections = health?.allowed_sections
  return Array.isArray(sections) && sections.includes(key)
}

/**
 * Compact status strip for the bot admin hub.
 */
export function BotHealthHubStrip({ onOpenDetails, autoRefresh = true }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await fetchAdminBotHealth()
      setHealth(data)
    } catch (err) {
      setError(err.message || 'Could not load bot health')
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!autoRefresh) return undefined
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [autoRefresh, load])

  const summary = health?.summary
  const state = summary?.connection_state || 'offline'
  const outbox = health?.outbox

  return (
    <div className="mb-6 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
            <HeartPulse className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-zinc-100">Bot health</h4>
              {loading ? (
                <Loader2 className="size-4 animate-spin text-zinc-500" aria-label="Loading" />
              ) : (
                <StatusBadge state={state} />
              )}
            </div>
            {!loading && summary && (
              <p className="mt-1 text-xs text-zinc-500">
                Heartbeat {formatRelativeSeconds(summary.heartbeat_age_seconds)}
                {summary.started_at ? ` · Uptime ${formatUptime(summary.started_at)}` : ''}
                {hasSection(health, 'outbox') && outbox?.pending != null
                  ? ` · ${outbox.pending} outbox pending`
                  : ''}
              </p>
            )}
            {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} disabled={loading} className={adminBtnSecondary}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {onOpenDetails ? (
            <button type="button" onClick={onOpenDetails} className={adminBtnSecondary}>
              View details
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Full bot health dashboard with sections filtered by role permissions.
 */
export default function BotHealthPanel({ autoRefresh = true }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await fetchAdminBotHealth()
      setHealth(data)
    } catch (err) {
      const msg = err.message || 'Could not load bot health'
      setError(msg)
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!autoRefresh) return undefined
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [autoRefresh, load])

  const summary = health?.summary
  const connection = health?.connection
  const outbox = health?.outbox
  const qotd = health?.qotd
  const cache = health?.cache
  const features = health?.features
  const activity = health?.activity

  const botAvatar = useMemo(() => {
    const userId = String(connection?.bot_discord_user_id || '').trim()
    if (!userId) return null
    const hash = String(connection?.bot_avatar_hash || '').trim() || null
    return {
      name: connection?.bot_global_name || connection?.bot_username || 'Bot',
      avatarUrl: discordAvatarUrl(userId, hash, 64),
    }
  }, [connection])

  const extraSections = useMemo(() => {
    if (!health?.allowed_sections) return 0
    return health.allowed_sections.filter((s) => s !== 'summary').length
  }, [health])

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }

  if (error && !health) {
    return (
      <p className={adminCalloutError}>
        {error.includes('insufficient permission')
          ? 'Your role does not have access to bot health. Ask a full admin to enable Bot health (access) in Role permissions.'
          : error}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">
            Last fetched {formatDateTime(health?.fetched_at)} · auto-refreshes every 30s
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading} className={adminBtnSecondary}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh now
        </button>
      </div>

      {error ? <p className={adminCalloutWarn}>{error}</p> : null}

      {hasSection(health, 'summary') && summary && (
        <section className={adminSubsection}>
          <div className={adminSubsectionHead}>
            <div>
              <h4>Overview</h4>
              <p>Live connection status from the bot process heartbeat.</p>
            </div>
            <StatusBadge state={summary.connection_state} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Gateway"
              value={summary.ws_status === 'ready' ? 'Ready' : 'Offline'}
              hint={`Heartbeat ${formatRelativeSeconds(summary.heartbeat_age_seconds)}`}
              tone={summary.connection_state === 'online' ? 'default' : summary.connection_state === 'degraded' ? 'warn' : 'danger'}
            />
            <MetricCard
              label="Uptime"
              value={formatUptime(summary.started_at)}
              hint={summary.started_at ? `Since ${formatDateTime(summary.started_at)}` : 'Bot has not reported startup yet'}
            />
            <MetricCard
              label="Guild"
              value={summary.guild_id ? 'Linked' : 'Not set'}
              hint={summary.guild_id || 'Set guild ID in Server settings'}
            />
            <MetricCard
              label="Panels visible"
              value={extraSections > 0 ? `${extraSections} detail sections` : 'Summary only'}
              hint="Based on your role permissions"
            />
          </div>
          {summary.connection_state === 'offline' && (
            <p className={`mt-3 ${adminCalloutWarn}`}>
              The bot has not sent a recent heartbeat. Check Railway logs, Discord token validity,
              and that the bot process is running.
            </p>
          )}
        </section>
      )}

      {extraSections === 0 && hasSection(health, 'summary') && (
        <p className={adminCalloutInfo}>
          Your role can see the summary only. A full admin can grant additional bot health sections
          (outbox, QOTD, cache, etc.) in Role permissions.
        </p>
      )}

      {hasSection(health, 'connection') && connection && (
        <section className={adminSubsection}>
          <div className={adminSubsectionHead}>
            <div className="flex items-center gap-3">
              {botAvatar ? (
                <img
                  src={botAvatar.avatarUrl}
                  alt=""
                  className="size-10 rounded-full ring-1 ring-zinc-700"
                />
              ) : (
                <Server className="size-5 text-zinc-500" />
              )}
              <div>
                <h4>Connection &amp; workers</h4>
                <p>Bot identity and background worker timestamps.</p>
              </div>
            </div>
          </div>
          <div className={adminInset}>
            <DetailRow label="Display name" value={botAvatar?.name || '—'} />
            <DetailRow label="Username" value={connection.bot_username ? `@${connection.bot_username}` : '—'} />
            <DetailRow label="Discord user ID" value={connection.bot_discord_user_id || '—'} mono />
            <DetailRow label="Process started" value={formatDateTime(connection.started_at)} />
            <DetailRow label="Last heartbeat" value={formatDateTime(connection.heartbeat_at)} />
            <DetailRow label="Outbox worker" value={formatDateTime(connection.outbox_last_run_at)} />
            <DetailRow label="QOTD scheduler check" value={formatDateTime(connection.qotd_last_check_at)} />
            <DetailRow label="Discord cache sync" value={formatDateTime(connection.cache_synced_at)} />
          </div>
        </section>
      )}

      {hasSection(health, 'outbox') && outbox && (
        <section className={adminSubsection}>
          <div className={adminSubsectionHead}>
            <div>
              <h4>Deploy outbox</h4>
              <p>Queued admin actions processed by the bot (deploy, sync, QOTD tests).</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Pending"
              value={outbox.pending ?? 0}
              tone={(outbox.pending ?? 0) > 0 ? 'warn' : 'default'}
            />
            <MetricCard label="Processing" value={outbox.processing ?? 0} />
            <MetricCard
              label="Failed"
              value={outbox.failed ?? 0}
              tone={(outbox.failed ?? 0) > 0 ? 'danger' : 'default'}
            />
            <MetricCard
              label="Completed (24h)"
              value={outbox.done_24h ?? 0}
              hint={outbox.last_processed_at ? `Last ${formatDateTime(outbox.last_processed_at)}` : undefined}
            />
          </div>
          {Array.isArray(outbox.recent_failures) && outbox.recent_failures.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Recent failures
              </p>
              <div className={adminTableWrap}>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Action</th>
                      <th className="px-3 py-2 text-left font-medium">Error</th>
                      <th className="px-3 py-2 text-left font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outbox.recent_failures.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 font-mono text-xs text-violet-200">{row.action}</td>
                        <td className="px-3 py-2 text-red-200">{row.error || '—'}</td>
                        <td className="px-3 py-2 text-zinc-400">{formatDateTime(row.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {hasSection(health, 'qotd') && qotd && (
        <section className={adminSubsection}>
          <div className={adminSubsectionHead}>
            <div>
              <h4>QOTD scheduler</h4>
              <p>Daily question automation status and recent runs.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Automation"
              value={qotd.enabled ? 'Enabled' : 'Disabled'}
              tone={qotd.enabled ? 'default' : 'warn'}
            />
            <MetricCard
              label="Question bank"
              value={`${qotd.active_questions ?? 0} active`}
              hint={`${qotd.total_questions ?? 0} total in bank`}
            />
            <MetricCard
              label="Post time (UTC)"
              value={`${String(qotd.post_hour_utc ?? '12').padStart(2, '0')}:${String(qotd.post_minute_utc ?? '0').padStart(2, '0')}`}
            />
            <MetricCard
              label="Last scheduler check"
              value={formatRelativeSeconds(
                qotd.last_check_at
                  ? (Date.now() - new Date(qotd.last_check_at).getTime()) / 1000
                  : null,
              )}
              hint={formatDateTime(qotd.last_check_at)}
            />
          </div>
          {Array.isArray(qotd.recent_runs) && qotd.recent_runs.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Recent runs
              </p>
              <div className={adminTableWrap}>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qotd.recent_runs.map((row) => (
                      <tr key={`${row.run_date}-${row.question_type}`}>
                        <td className="px-3 py-2 text-zinc-300">{row.run_date}</td>
                        <td className="px-3 py-2 font-mono text-xs text-zinc-400">{row.question_type}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${
                              row.status === 'posted'
                                ? 'bg-emerald-500/15 text-emerald-200'
                                : row.status === 'failed'
                                  ? 'bg-red-500/15 text-red-200'
                                  : 'bg-zinc-700/50 text-zinc-400'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-zinc-500">{formatDateTime(row.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {hasSection(health, 'cache') && cache && (
        <section className={adminSubsection}>
          <div className={adminSubsectionHead}>
            <div className="flex items-center gap-2">
              <Database className="size-5 text-sky-400" />
              <div>
                <h4>Discord cache</h4>
                <p>Synced channels, roles, and members for admin dropdowns.</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Channels" value={cache.channels ?? 0} />
            <MetricCard label="Roles" value={cache.roles ?? 0} />
            <MetricCard label="Members" value={cache.members ?? 0} />
            <MetricCard
              label="Last sync"
              value={formatRelativeSeconds(
                cache.synced_at
                  ? (Date.now() - new Date(cache.synced_at).getTime()) / 1000
                  : null,
              )}
              hint={formatDateTime(cache.synced_at)}
            />
          </div>
        </section>
      )}

      {hasSection(health, 'features') && features && (
        <section className={adminSubsection}>
          <div className={adminSubsectionHead}>
            <div className="flex items-center gap-2">
              <Zap className="size-5 text-amber-400" />
              <div>
                <h4>Enabled features</h4>
                <p>Which bot capabilities are turned on in settings.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <FeatureFlag label="QOTD" enabled={features.qotd_enabled} />
            <FeatureFlag label="Mod logs" enabled={features.mod_log_enabled} />
            <FeatureFlag label="Welcome" enabled={features.welcome_enabled} />
            <FeatureFlag label="Goodbye" enabled={features.goodbye_enabled} />
            <FeatureFlag label="Account age gate" enabled={features.account_age_gate_enabled} />
            <FeatureFlag label="Content filter" enabled={features.content_filter_enabled} />
            <FeatureFlag label="Join-to-create VC" enabled={features.join_to_create_configured} />
            <FeatureFlag label="Guild linked" enabled={features.guild_id_set} />
          </div>
        </section>
      )}

      {hasSection(health, 'activity') && activity && (
        <section className={adminSubsection}>
          <div className={adminSubsectionHead}>
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-fuchsia-400" />
              <div>
                <h4>Activity (24h)</h4>
                <p>Operational counters across panels, voice, and moderation.</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Reaction panels"
              value={`${activity.panels_live ?? 0} live`}
              hint={`${activity.panels_total ?? 0} total configured`}
            />
            <MetricCard label="Active reaction roles" value={activity.active_reaction_roles ?? 0} />
            <MetricCard label="Temp voice channels" value={activity.temp_voice_channels ?? 0} />
            <MetricCard label="Mod log events" value={activity.mod_log_events_24h ?? 0} />
            <MetricCard label="Security actions" value={activity.security_actions_24h ?? 0} />
          </div>
        </section>
      )}

      {!hasSection(health, 'summary') && (
        <p className={adminCalloutWarn}>
          No health sections available for your role. Enable Bot health (access) in Role permissions.
        </p>
      )}
    </div>
  )
}
