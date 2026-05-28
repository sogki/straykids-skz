import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Scroll the window to the top when the route pathname changes.
 */
export function useScrollToTopOnRoute() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])
}
