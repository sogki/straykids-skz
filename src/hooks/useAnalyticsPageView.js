import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '@/services/skzAnalytics'

/** Fire a page_view when the route changes (skips /admin). */
export function useAnalyticsPageView() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    trackPageView(pathname)
  }, [pathname])
}
