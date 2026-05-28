import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, FlaskConical, Loader2, Play } from 'lucide-react'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb'
import AdminSelect from '@/components/admin/AdminSelect'
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCalloutInfo,
  adminFeatureList,
  adminField,
  adminFieldLabel,
  adminPanel,
  adminStack,
} from '@/components/admin/adminUi'
import {
  BOT_FEATURE_DEFAULTS,
  BOT_FEATURE_LABELS,
  PREVIEW_PRESETS,
  buildPreviewFromPreset,
  buildPreviewFromRolePermission,
  clearAdminPreview,
  getAdminPreview,
  mergeBotFeatureAccess,
  setAdminPreview,
} from '@/services/adminPreview'
import { getStoredAdminCode } from '@/services/skzAdmin'
import { fetchBotConfig } from '@/services/skzAdminBot'
import { useAdminAccess } from '@/hooks/useAdminAccess'

function FeatureChips({ features }) {
  const enabled = Object.entries(BOT_FEATURE_LABELS).filter(([key]) => features[key])
  if (enabled.length === 0) {
    return <span className="text-xs text-zinc-500">No bot features enabled</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {enabled.map(([key, label]) => (
        <span
          key={key}
          className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-200"
        >
          {label}
        </span>
      ))}
    </div>
  )
}

export default function DeveloperTools() {
  const navigate = useNavigate()
  const { isPreview, preview: activePreview } = useAdminAccess()
  const code = getStoredAdminCode()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')

  const loadRoles = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchBotConfig(code)
      setRoles(Array.isArray(data.rolePermissions) ? data.rolePermissions : [])
    } catch (err) {
      setError(err.message || 'Could not load role mappings')
      setRoles([])
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  const options = useMemo(() => {
    const mapped = roles.map((rp) => ({
      id: `role:${rp.discord_role_id}`,
      label: rp.label || rp.discord_role_id,
      description: `${rp.permission_level} · ID ${rp.discord_role_id}`,
      kind: 'role',
      role: rp,
    }))
    const presets = PREVIEW_PRESETS.map((p) => ({
      id: p.id,
      label: p.label,
      description: `${p.permission_level} preset (not tied to a Discord role)`,
      kind: 'preset',
      preset: p,
    }))
    return [...presets, ...mapped]
  }, [roles])

  useEffect(() => {
    if (selectedId) return
    const current = getAdminPreview()
    if (current?.presetId) {
      setSelectedId(current.presetId)
      return
    }
    if (current?.roleId) {
      setSelectedId(`role:${current.roleId}`)
    }
  }, [selectedId, isPreview])

  const selectedOption = options.find((o) => o.id === selectedId)
  const previewFeatures = useMemo(() => {
    if (!selectedOption) return null
    if (selectedOption.kind === 'preset') {
      return mergeBotFeatureAccess(
        selectedOption.preset.permission_level,
        selectedOption.preset.bot_feature_access,
      )
    }
    return mergeBotFeatureAccess(
      selectedOption.role.permission_level,
      selectedOption.role.bot_feature_access,
    )
  }, [selectedOption])

  function startPreview() {
    if (!selectedOption) return
    const payload =
      selectedOption.kind === 'preset'
        ? buildPreviewFromPreset(selectedOption.preset)
        : buildPreviewFromRolePermission(selectedOption.role)
    setAdminPreview(payload)
    navigate('/admin/bot')
  }

  function exitPreview() {
    clearAdminPreview()
  }

  const breadcrumbItems = [
    { key: 'dashboard', label: 'Dashboard', onClick: () => navigate('/admin') },
    { key: 'developer', label: 'Developer tools' },
  ]

  return (
    <div className="space-y-6">
      <AdminBreadcrumb items={breadcrumbItems} />

      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
          <FlaskConical className="size-5 text-violet-400" aria-hidden />
          Developer tools
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Preview the admin panel as a mapped Discord role would see it — similar to Discord&apos;s
          role view. Full admins only.
        </p>
      </div>

      {isPreview && activePreview && (
        <p className={adminCalloutInfo}>
          <span className="font-semibold">Preview active: </span>
          {activePreview.label} ({activePreview.permission_level}). Exit preview to change role or
          return to your normal view.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className={adminPanel}>
        <div className="admin-subsection__head">
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Role preview</h3>
            <p className="text-sm text-zinc-500">
              Pick a role mapping or preset, then open the panel to walk through permissions.
            </p>
          </div>
          <button type="button" className={adminBtnSecondary} onClick={loadRoles} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Refresh roles
          </button>
        </div>

        <div className={`${adminStack} mt-4`}>
          <label className={`${adminField} max-w-xl`}>
            <span className={adminFieldLabel}>Preview as</span>
            <AdminSelect
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={loading || options.length === 0}
            >
              <option value="">Select a role or preset…</option>
              {options.length > 0 && (
                <optgroup label="Presets">
                  {options
                    .filter((o) => o.kind === 'preset')
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                </optgroup>
              )}
              {roles.length > 0 && (
                <optgroup label="Mapped Discord roles">
                  {options
                    .filter((o) => o.kind === 'role')
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label} ({o.role.permission_level})
                      </option>
                    ))}
                </optgroup>
              )}
            </AdminSelect>
          </label>

          {selectedOption && previewFeatures && (
            <div className="admin-inset space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                This role would see
              </p>
              <FeatureChips features={previewFeatures} />
              <p className="text-xs text-zinc-500">
                Website sections:{' '}
                {selectedOption.role?.permission_level === 'full_admin' ||
                selectedOption.preset?.permission_level === 'full_admin'
                  ? 'Dashboard, banner, analytics, leaderboard, games, requests, bot'
                  : selectedOption.role?.permission_level === 'moderator' ||
                      selectedOption.preset?.permission_level === 'moderator'
                    ? 'Discord bot only'
                    : 'None (no admin access)'}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={adminBtnPrimary}
              disabled={!selectedId}
              onClick={startPreview}
            >
              <Play className="size-4" />
              Start preview
            </button>
            {isPreview && (
              <button type="button" className={adminBtnSecondary} onClick={exitPreview}>
                <Eye className="size-4" />
                Exit preview
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={adminPanel}>
        <h3 className="text-base font-semibold text-zinc-100">Default feature sets</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Reference for what each permission level starts with before per-role toggles.
        </p>
        <div className={`${adminFeatureList} mt-4`}>
          {(['full_admin', 'moderator', 'member']).map((level) => (
            <div key={level} className="admin-inset space-y-2">
              <p className="text-sm font-medium capitalize text-zinc-200">{level.replace('_', ' ')}</p>
              <FeatureChips features={BOT_FEATURE_DEFAULTS[level]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
