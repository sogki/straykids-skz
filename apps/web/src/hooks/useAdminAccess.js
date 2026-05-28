import { useMemo, useSyncExternalStore } from 'react'
import {
  getEffectiveAdminAccess,
  getAdminPreview,
  subscribeAdminPreview,
} from '@/services/adminPreview'
import { getStoredAdminAccess } from '@/services/skzAdmin'

/** Cached snapshot — getSnapshot must return stable reference when data unchanged. */
let snapshotKey = ''
let snapshotCache = null

function buildSnapshotKey(preview, realAccess, access) {
  return JSON.stringify({
    previewActive: Boolean(preview?.active),
    previewPreset: preview?.presetId ?? null,
    previewRole: preview?.roleId ?? null,
    previewLevel: preview?.permission_level ?? null,
    realLevel: realAccess?.permission_level ?? null,
    effectiveLevel: access?.permission_level ?? null,
    features: access?.allowed_bot_features ?? null,
  })
}

function getSnapshot() {
  const preview = getAdminPreview()
  const realAccess = getStoredAdminAccess()
  const access = getEffectiveAdminAccess()
  const key = buildSnapshotKey(preview, realAccess, access)

  if (key === snapshotKey && snapshotCache) {
    return snapshotCache
  }

  snapshotKey = key
  snapshotCache = { access, preview, realAccess }
  return snapshotCache
}

export function useAdminAccess() {
  const { access, preview, realAccess } = useSyncExternalStore(
    subscribeAdminPreview,
    getSnapshot,
    getSnapshot,
  )

  return useMemo(() => {
    const isPreview = Boolean(preview?.active)
    const isRealFullAdminUser = realAccess?.permission_level === 'full_admin'
    const permissionLevel = access?.permission_level ?? 'none'
    const isFullAdmin = permissionLevel === 'full_admin'
    const isModerator = permissionLevel === 'moderator'
    const featureAccess = access?.allowed_bot_features ?? {}

    return {
      access,
      realAccess,
      preview,
      isPreview,
      isRealFullAdmin: isRealFullAdminUser,
      isFullAdmin,
      isModerator,
      permissionLevel,
      featureAccess,
      previewReadOnly: isPreview,
      moderatorOnlyView: isModerator && (!isRealFullAdminUser || isPreview),
    }
  }, [access, preview, realAccess])
}
