import { useEffect, useMemo } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bot,
  ClipboardList,
  Clock3,
  FlaskConical,
  Gamepad2,
  HeartPulse,
  Home,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  ListOrdered,
  LogOut,
  Megaphone,
  ScrollText,
  Server,
  Shield,
  ShieldAlert,
  Trophy,
  Inbox,
  UserPlus,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import AdminPreviewBanner from '@/components/admin/AdminPreviewBanner'
import AdminBotNavGroup from '@/components/admin/AdminBotNavGroup'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { signOutAdminAuth } from '@/services/skzAdmin'
import { BOT_NAV_PAGE_TITLES, getBotNavItems } from '@/lib/admin/botNav'
import { cn } from '@/lib/utils'
import '@/styles/Admin.css'

const SITE_NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/banner', label: 'Site banner', icon: Megaphone },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/admin/games', label: 'Games', icon: Gamepad2 },
  { to: '/admin/requests', label: 'Requests', icon: Inbox },
] as const

const DEV_NAV = [
  { to: '/admin/developer', label: 'Developer tools', icon: FlaskConical, badge: 'Beta' as const },
] as const

const BOT_ICON_MAP = {
  bot: Bot,
  'layout-dashboard': LayoutDashboard,
  'layout-grid': LayoutGrid,
  'key-round': KeyRound,
  server: Server,
  'list-ordered': ListOrdered,
  shield: Shield,
  'shield-alert': ShieldAlert,
  'user-plus': UserPlus,
  'heart-pulse': HeartPulse,
  'scroll-text': ScrollText,
  'clipboard-list': ClipboardList,
  'clock-3': Clock3,
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string
  items: ReadonlyArray<{
    to: string
    end?: boolean
    label: string
    icon: typeof Bot
    badge?: string
  }>
  pathname: string
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ to, end, label, icon: Icon, badge }) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton
                render={<NavLink to={to} end={end} />}
                isActive={end ? pathname === '/admin' : pathname.startsWith(to)}
                tooltip={badge ? `${label} (${badge})` : label}
              >
                <Icon />
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate">{label}</span>
                  {badge ? (
                    <span className="shrink-0 rounded border border-violet-500/35 bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-300">
                      {badge}
                    </span>
                  ) : null}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { isFullAdmin, isModerator, isPreview, isRealFullAdmin, featureAccess } = useAdminAccess()
  const siteNavItems = isFullAdmin ? SITE_NAV : []
  const showBotNav = isFullAdmin || isModerator
  const showDevNav = isRealFullAdmin && !isPreview

  const botNavItems = useMemo(
    () =>
      showBotNav
        ? getBotNavItems({ isFullAdmin, isRealFullAdmin, featureAccess }).map((item) => ({
            to: item.path,
            end: item.path === '/admin/bot/features',
            label: item.label,
            icon: BOT_ICON_MAP[item.icon] || Bot,
          }))
        : [],
    [showBotNav, isFullAdmin, isRealFullAdmin, featureAccess],
  )

  useEffect(() => {
    document.documentElement.classList.add('dark')
    return () => document.documentElement.classList.remove('dark')
  }, [])

  function handleLogout() {
    signOutAdminAuth().finally(() => navigate('/admin/login', { replace: true }))
  }

  const pageTitle = useMemo(() => {
    if (pathname === '/admin/developer') return 'Developer tools'
    if (pathname === '/admin/banner') return 'Site banner'
    if (pathname === '/admin/leaderboard') return 'Leaderboard'
    if (pathname === '/admin/analytics') return 'Analytics'
    if (pathname === '/admin/games') return 'Games'
    if (pathname === '/admin/requests') return 'Requests'
    if (pathname === '/admin') return 'Dashboard'
    if (pathname.startsWith('/admin/bot')) {
      const segment = pathname.replace(/^\/admin\/bot\/?/, '').split('/')[0] || 'features'
      return BOT_NAV_PAGE_TITLES[segment] || 'Discord bot'
    }
    return 'Admin'
  }, [pathname])

  return (
    <TooltipProvider>
      <SidebarProvider className="admin-shell min-h-svh">
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-1 py-0.5">
              <img
                src="https://vwdrdqkzjkfdmycomfvf.supabase.co/storage/v1/object/public/skz_arcade/skz-admin-panel-icon.png"
                alt="SKZ Admin Panel"
                className="size-8 rounded-md object-cover"
              />
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-semibold">SKZ Admin</span>
                <span className="text-xs text-muted-foreground">Staff panel</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="admin-sidebar-scroll">
            {siteNavItems.length > 0 ? (
              <NavGroup label="Website" items={siteNavItems} pathname={pathname} />
            ) : null}
            {showBotNav && botNavItems.length > 0 ? (
              <AdminBotNavGroup items={botNavItems} pathname={pathname} />
            ) : null}
            {showDevNav ? (
              <NavGroup label="Developer" items={DEV_NAV} pathname={pathname} />
            ) : null}
          </SidebarContent>
          <SidebarFooter>
            <SidebarSeparator />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/" />} tooltip="Back to main site">
                  <Home />
                  <span>View site</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Sign out">
                  <LogOut />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="admin-shell-inset min-h-svh">
          <header className="admin-shell-header flex h-14 shrink-0 items-center gap-2 px-4 md:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-1 items-center justify-between gap-4">
              <h1 className="text-sm font-semibold">{pageTitle}</h1>
              <span
                className={cn(
                  'hidden items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-flex',
                  isPreview
                    ? 'border-amber-500/35 bg-amber-500/10 text-amber-300'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    isPreview ? 'bg-amber-400' : 'animate-pulse bg-emerald-400',
                  )}
                />
                {isPreview ? 'Preview' : 'Live'}
              </span>
            </div>
          </header>
          <div className="admin-shell-content admin-shell-content--flush flex flex-1 flex-col">
            <AdminPreviewBanner />
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
