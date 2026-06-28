import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { splitBotNavItems } from '@/lib/admin/botNav'
import { cn } from '@/lib/utils'

const BOT_NAV_OPEN_KEY = 'skz_admin_bot_features_nav_open'

function readStoredOpen(fallback) {
  try {
    const raw = sessionStorage.getItem(BOT_NAV_OPEN_KEY)
    if (raw === 'true') return true
    if (raw === 'false') return false
  } catch {
    /* ignore */
  }
  return fallback
}

/**
 * Discord bot sidebar group — collapsible Features parent with nested feature links.
 */
export default function AdminBotNavGroup({ items, pathname }) {
  const onBotRoute = pathname.startsWith('/admin/bot')
  const { hub, children } = splitBotNavItems(items)
  const [open, setOpen] = useState(() => readStoredOpen(onBotRoute))

  useEffect(() => {
    if (onBotRoute) setOpen(true)
  }, [onBotRoute])

  useEffect(() => {
    try {
      sessionStorage.setItem(BOT_NAV_OPEN_KEY, String(open))
    } catch {
      /* ignore */
    }
  }, [open])

  if (!hub) return null

  const HubIcon = hub.icon
  const hubActive =
    pathname === hub.to || (hub.end && pathname.startsWith('/admin/bot'))

  function toggleOpen(event) {
    event.preventDefault()
    event.stopPropagation()
    setOpen((prev) => !prev)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Discord bot</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<NavLink to={hub.to} end={hub.end} />}
              isActive={hubActive}
              tooltip={hub.label}
            >
              <HubIcon />
              <span className="truncate">{hub.label}</span>
            </SidebarMenuButton>
            {children.length > 0 ? (
              <SidebarMenuAction
                type="button"
                aria-label={open ? 'Collapse features' : 'Expand features'}
                aria-expanded={open}
                onClick={toggleOpen}
                className={cn(
                  'opacity-100 transition-transform duration-200',
                  open && 'rotate-180',
                )}
              >
                <ChevronDown />
              </SidebarMenuAction>
            ) : null}
            {open && children.length > 0 ? (
              <SidebarMenuSub className="admin-sidebar-sub">
                {children.map(({ to, end, label, icon: Icon }) => {
                  const active = end ? pathname === to : pathname.startsWith(to)
                  return (
                    <SidebarMenuSubItem key={to}>
                      <SidebarMenuSubButton render={<NavLink to={to} end={end} />} isActive={active}>
                        <Icon />
                        <span className="truncate">{label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            ) : null}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
