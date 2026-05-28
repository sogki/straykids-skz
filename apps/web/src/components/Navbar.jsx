import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Dices, Menu } from 'lucide-react'
import { useSkzData } from '@/context/SkzDataContext'
import {
  buildGamesMenuItems,
  NAV_DISCORD,
  NAV_HOME,
  NAV_PLAY_RANDOM_LABEL,
} from '@/data/navMenu'
import { pickRandomGame } from '@/utils/randomGame'
import { useNavbarScrolled } from '@/hooks/useNavbarScrolled'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import SiteLogo from '@/components/SiteLogo'
import SiteBanner from '@/components/SiteBanner'
import {
  NavbarPlayerAccountDesktop,
  NavbarPlayerAccountMobile,
  NavbarPlayerSessionSync,
} from '@/components/NavbarPlayerAccount'
import { cn } from '@/lib/utils'
import '@/styles/SiteChrome.css'
import '@/styles/Navbar.css'
import '@/styles/SiteBanner.css'
import '@/styles/SiteLogo.css'

function PlayRandomButton({ games, className, onAfterNavigate, mobile = false }) {
  const navigate = useNavigate()

  function handleClick() {
    const game = pickRandomGame(games)
    navigate(game?.path ?? '/arcade')
    onAfterNavigate?.()
  }

  const label = (
    <>
      <span className="navbar-cta-play__sep" aria-hidden="true">
        |
      </span>
      <Dices className="size-4 shrink-0" aria-hidden="true" />
      {NAV_PLAY_RANDOM_LABEL}
    </>
  )

  if (mobile) {
    return (
      <Button
        type="button"
        variant="outline"
        className={cn('navbar-cta-play navbar-cta-play--mobile', className)}
        onClick={handleClick}
      >
        {label}
      </Button>
    )
  }

  return (
    <button
      type="button"
      className={cn('navbar-cta-play navbar-nav-link', className)}
      onClick={handleClick}
    >
      {label}
    </button>
  )
}

function NavSubmenuLink({ item, onNavigate }) {
  const className = 'navbar-submenu-link'
  const body = (
    <>
      <div className="navbar-submenu-link__icon">{item.icon}</div>
      <div>
        <div className="navbar-submenu-link__title">{item.title}</div>
        {item.description && (
          <p className="navbar-submenu-link__desc">{item.description}</p>
        )}
      </div>
    </>
  )

  if (item.url.startsWith('http')) {
    return (
      <a
        href={item.url}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
      >
        {body}
      </a>
    )
  }

  if (item.url.includes('#')) {
    return (
      <a href={item.url} className={className} onClick={onNavigate}>
        {body}
      </a>
    )
  }

  return (
    <Link to={item.url} className={className} onClick={onNavigate}>
      {body}
    </Link>
  )
}

function DesktopMenuItem({ item }) {
  if (item.items?.length) {
    return (
      <NavigationMenuItem>
        <NavigationMenuTrigger className="navbar-nav-link navbar-nav-link--trigger">
          {item.title}
        </NavigationMenuTrigger>
        <NavigationMenuContent className="navbar-dropdown-panel">
          <ul className="navbar-dropdown-list">
            {item.items.map((sub) => (
              <li key={sub.title}>
                <NavSubmenuLink item={sub} />
              </li>
            ))}
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    )
  }

  if (item.external) {
    return (
      <NavigationMenuItem>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="navbar-nav-link"
        >
          {item.title}
        </a>
      </NavigationMenuItem>
    )
  }

  return (
    <NavigationMenuItem>
      <NavigationMenuLink
        render={<Link to={item.url} className="navbar-nav-link" />}
      >
        {item.title}
      </NavigationMenuLink>
    </NavigationMenuItem>
  )
}

function MobileMenuItem({ item, onClose }) {
  if (item.items?.length) {
    return (
      <AccordionItem value={item.title} className="border-b-0">
        <AccordionTrigger className="py-2 text-base font-semibold text-white hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2 pb-2">
          {item.items.map((sub) => (
            <NavSubmenuLink
              key={sub.title}
              item={sub}
              onNavigate={onClose}
            />
          ))}
        </AccordionContent>
      </AccordionItem>
    )
  }

  if (item.external) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="navbar-mobile-link"
        onClick={onClose}
      >
        {item.title}
      </a>
    )
  }

  return (
    <Link to={item.url} className="navbar-mobile-link" onClick={onClose}>
      {item.title}
    </Link>
  )
}

export default function Navbar() {
  const scrolled = useNavbarScrolled(36)
  const { pathname } = useLocation()
  const { games } = useSkzData()
  const [mobileOpen, setMobileOpen] = useState(false)
  const chromeRef = useRef(null)
  const isHome = pathname === '/'

  const menu = useMemo(
    () => [NAV_HOME, buildGamesMenuItems(games), NAV_DISCORD],
    [games]
  )

  useEffect(() => {
    const el = chromeRef.current
    if (!el) return

    const apply = () => {
      document.documentElement.style.setProperty(
        '--site-chrome-height',
        `${el.offsetHeight}px`
      )
    }

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)

    return () => {
      observer.disconnect()
      document.documentElement.style.setProperty('--site-chrome-height', '0px')
    }
  }, [])

  return (
    <>
      <NavbarPlayerSessionSync />
      <header
        ref={chromeRef}
        className={cn('site-chrome', isHome && 'site-chrome--overlay')}
        aria-label="Site"
      >
        <div className="site-chrome__inner">
          <SiteBanner />
          <nav
            className={cn(
              'navbar-shell',
              scrolled && 'navbar-shell--scrolled'
            )}
            aria-label="Main"
          >
            <SiteLogo
              variant="white"
              className="navbar-logo"
              imgClassName="site-logo__img--navbar"
            />

            {/* Desktop — hidden below lg */}
            <div className="navbar-desktop">
              <NavigationMenu className="navbar-menu">
                <NavigationMenuList className="navbar-menu-list">
                  {menu.map((item) => (
                    <DesktopMenuItem key={item.title} item={item} />
                  ))}
                </NavigationMenuList>
              </NavigationMenu>

              <div className="navbar-desktop__actions">
                <PlayRandomButton
                  games={games}
                  className="navbar-cta-play"
                />
                <NavbarPlayerAccountDesktop />
              </div>
            </div>

            {/* Mobile menu — hidden from lg up */}
            <div className="navbar-mobile">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Open menu"
                      className="navbar-mobile-trigger"
                    />
                  }
                >
                  <Menu className="size-5" aria-hidden="true" />
                </SheetTrigger>
                <SheetContent className="navbar-sheet border-skz-border bg-skz-surface">
                  <SheetHeader>
                    <SheetTitle>
                      <SiteLogo
              variant="white"
              className="navbar-logo"
              imgClassName="site-logo__img--navbar"
            />
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-6 p-4">
                    <div className="flex flex-col gap-4">
                      <Link
                        to={NAV_HOME.url}
                        className="navbar-mobile-link"
                        onClick={() => setMobileOpen(false)}
                      >
                        {NAV_HOME.title}
                      </Link>
                      <Accordion type="single" collapsible className="w-full">
                        <MobileMenuItem
                          item={buildGamesMenuItems(games)}
                          onClose={() => setMobileOpen(false)}
                        />
                      </Accordion>
                      <a
                        href={NAV_DISCORD.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="navbar-mobile-link"
                        onClick={() => setMobileOpen(false)}
                      >
                        {NAV_DISCORD.title}
                      </a>
                    </div>
                    <NavbarPlayerAccountMobile
                      onClose={() => setMobileOpen(false)}
                    />
                    <PlayRandomButton
                      games={games}
                      mobile
                      onAfterNavigate={() => setMobileOpen(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </nav>
        </div>
      </header>
      {!isHome && (
        <div
          className="shrink-0"
          style={{ height: 'var(--site-chrome-height, 5.75rem)' }}
          aria-hidden="true"
        />
      )}
    </>
  )
}
