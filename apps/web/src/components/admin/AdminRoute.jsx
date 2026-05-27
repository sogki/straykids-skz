import { Navigate, Outlet } from 'react-router-dom'
import { getStoredAdminCode } from '@/services/skzAdmin'

export function AdminGuestRoute() {
  const code = getStoredAdminCode()
  if (code) return <Navigate to="/admin" replace />
  return <Outlet />
}

export function AdminProtectedRoute() {
  const code = getStoredAdminCode()
  if (!code) return <Navigate to="/admin/login" replace />
  return <Outlet />
}
