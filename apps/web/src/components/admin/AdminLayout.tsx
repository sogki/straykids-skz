import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bot,
  Gamepad2,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Trophy,
  Inbox,
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
import { getStoredAdminAccess, signOutAdminAuth } from '@/services/skzAdmin'
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

const BOT_NAV = [{ to: '/admin/bot', label: 'Discord bot', icon: Bot }] as const

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string
  items: ReadonlyArray<{ to: string; end?: boolean; label: string; icon: typeof Bot }>
  pathname: string
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ to, end, label, icon: Icon }) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton
                render={<NavLink to={to} end={end} />}
                isActive={end ? pathname === '/admin' : pathname.startsWith(to)}
                tooltip={label}
              >
                <Icon />
                <span>{label}</span>
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
  const access = getStoredAdminAccess()
  const permission = access?.permission_level ?? 'none'
  const isFullAdmin = permission === 'full_admin'
  const siteNavItems = isFullAdmin ? SITE_NAV : []
  const showBotNav = isFullAdmin || permission === 'moderator'

  useEffect(() => {
    document.documentElement.classList.add('dark')
    return () => document.documentElement.classList.remove('dark')
  }, [])

  function handleLogout() {
    signOutAdminAuth().finally(() => navigate('/admin/login', { replace: true }))
  }

  const pageTitle =
    pathname === '/admin/banner'
      ? 'Site banner'
      : pathname === '/admin/leaderboard'
        ? 'Leaderboard'
        : pathname === '/admin/analytics'
          ? 'Analytics'
          : pathname === '/admin/games'
            ? 'Games'
            : pathname === '/admin/requests'
              ? 'Requests'
              : pathname === '/admin/bot'
                ? 'Discord bot'
                : pathname === '/admin'
                  ? 'Dashboard'
                  : 'Admin'

  return (
    <TooltipProvider>
      <SidebarProvider className="admin-shell min-h-svh">
        <Sidebar variant="inset" collapsible="icon">
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
          <SidebarContent>
            {siteNavItems.length > 0 ? (
              <NavGroup label="Website" items={siteNavItems} pathname={pathname} />
            ) : null}
            {showBotNav ? (
              <NavGroup label="Discord bot" items={BOT_NAV} pathname={pathname} />
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

        <SidebarInset className="admin-shell-inset">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-1 items-center justify-between gap-4">
              <h1 className="text-sm font-semibold">{pageTitle}</h1>
              <span
                className={cn(
                  'hidden items-center gap-1.5 rounded-full border border-emerald-500/30',
                  'bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 sm:inline-flex',
                )}
              >
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
            </div>
          </header>
          <div className="admin-shell-content flex flex-1 flex-col gap-4">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
