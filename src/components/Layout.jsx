import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import RouteDocumentMeta from '@/components/RouteDocumentMeta'
import AppUpdateToast from '@/components/AppUpdateToast'
import SmallScreenWarning from '@/components/SmallScreenWarning'
import { useAnalyticsPageView } from '@/hooks/useAnalyticsPageView'

const GAME_PATHS = ['/guess-song', '/guess-member', '/guess-lyric', '/memory-match', '/tier-list', '/fan-profile', '/bias-quiz', '/higher-lower', '/audio-guess']

function gameMainClass(pathname) {
  if (pathname === '/tier-list') {
    return 'w-full max-w-none flex-1 pt-2 pb-10'
  }
  if (pathname === '/fan-profile') {
    return 'w-full max-w-none flex-1 px-4 pb-10 pt-2 sm:px-6 lg:px-8 xl:px-10'
  }
  if (pathname === '/arcade') {
    return 'mx-auto w-full max-w-[1140px] flex-1 px-5 pb-10 pt-2 md:px-8 md:pb-14'
  }
  if (pathname === '/guess-song' || pathname.startsWith('/guess-song/')) {
    return 'mx-auto w-full max-w-[1040px] flex-1 px-5 pb-10 pt-2 md:px-8 md:pb-14'
  }
  if (
    GAME_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
  ) {
    return 'mx-auto w-full max-w-[960px] flex-1 px-5 pb-10 pt-2 md:px-8 md:pb-14'
  }
  return 'mx-auto w-full max-w-[640px] flex-1 px-5 pb-8 md:px-8 md:pb-16'
}

export default function Layout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  useAnalyticsPageView()

  return (
    <div className="flex min-h-screen flex-col">
      <RouteDocumentMeta />
      <Navbar />
      <main className={isHome ? 'flex-1' : gameMainClass(pathname)}>
        <Outlet />
      </main>
      <Footer />
      <AppUpdateToast />
      <SmallScreenWarning />
    </div>
  )
}
