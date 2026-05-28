import { Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  bootstrapAdminSession,
  getStoredAdminAccess,
} from '@/services/skzAdmin'

export function AdminGuestRoute() {
  const access = getStoredAdminAccess()
  if (['full_admin', 'moderator'].includes(access?.permission_level)) {
    return <Navigate to="/admin" replace />
  }
  return <Outlet />
}

export function AdminProtectedRoute() {
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { access } = await bootstrapAdminSession()
        if (!active) return
        const hasPermission = ['full_admin', 'moderator'].includes(
          access?.permission_level,
        )
        setAllowed(hasPermission)
      } catch {
        if (!active) return
        const fallbackAccess = getStoredAdminAccess()
        setAllowed(
          ['full_admin', 'moderator'].includes(fallbackAccess?.permission_level),
        )
      } finally {
        if (active) setReady(true)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  if (!ready) return null
  if (!allowed) return <Navigate to="/admin/login" replace />
  return <Outlet />
}

export function AdminFullRoute() {
  const access = getStoredAdminAccess()
  if (access?.permission_level !== 'full_admin') {
    return <Navigate to="/admin/bot" replace />
  }
  return <Outlet />
}
