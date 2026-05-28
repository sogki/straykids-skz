import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut, User } from 'lucide-react'
import { usePlayerSessionContext } from '@/context/PlayerSessionContext'
import { discordAvatarUrl } from '@/services/skzPlayerAuth'
import { cn } from '@/lib/utils'

function displayName(access) {
  return access?.discord_username || access?.username || 'Player'
}

function AccountMenuItems({ onNavigate, className }) {
  const { signOut } = usePlayerSessionContext()

  return (
    <div className={cn('navbar-account-menu', className)} role="menu">
      <Link
        to="/profile"
        className="navbar-account-menu__item"
        role="menuitem"
        onClick={onNavigate}
      >
        <User className="size-4 shrink-0 opacity-80" aria-hidden="true" />
        Profile
      </Link>
      <button
        type="button"
        className="navbar-account-menu__item navbar-account-menu__item--danger"
        role="menuitem"
        onClick={() => {
          onNavigate?.()
          signOut()
        }}
      >
        <LogOut className="size-4 shrink-0 opacity-80" aria-hidden="true" />
        Sign out
      </button>
    </div>
  )
}

export function NavbarPlayerAccountDesktop() {
  const { access, loading } = usePlayerSessionContext()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (loading || !access) return null

  const name = displayName(access)
  const avatar = discordAvatarUrl(access.discord_user_id, access.avatar_hash, 64)

  return (
    <div ref={rootRef} className="navbar-account">
      <button
        type="button"
        className={cn('navbar-account__trigger', open && 'navbar-account__trigger--open')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <img src={avatar} alt="" className="navbar-account__avatar" width={28} height={28} />
        <span className="navbar-account__name">{name}</span>
        <ChevronDown className="navbar-account__chevron size-4" aria-hidden="true" />
      </button>
      {open && (
        <AccountMenuItems
          className="navbar-account__dropdown"
          onNavigate={() => setOpen(false)}
        />
      )}
    </div>
  )
}

export function NavbarPlayerAccountMobile({ onClose }) {
  const { access, loading } = usePlayerSessionContext()

  if (loading || !access) return null

  const name = displayName(access)
  const avatar = discordAvatarUrl(access.discord_user_id, access.avatar_hash, 64)

  return (
    <div className="navbar-account navbar-account--mobile">
      <div className="navbar-account__mobile-header">
        <img src={avatar} alt="" className="navbar-account__avatar" width={40} height={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          {access.total_points != null && (
            <p className="text-xs text-zinc-400">
              {access.total_points} pts
              {access.global_rank ? ` · #${access.global_rank}` : ''}
            </p>
          )}
        </div>
      </div>
      <AccountMenuItems
        className="navbar-account__dropdown navbar-account__dropdown--mobile"
        onNavigate={onClose}
      />
    </div>
  )
}

/** Refresh session when route changes (e.g. after OAuth on /profile). */
export function NavbarPlayerSessionSync() {
  const { pathname } = useLocation()
  const { reload } = usePlayerSessionContext()

  useEffect(() => {
    reload()
  }, [pathname, reload])

  return null
}
