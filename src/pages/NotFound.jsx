import { Link } from 'react-router-dom'
import { Compass, Gamepad2, Music2, Sparkles } from 'lucide-react'
import { SITE_LOGOS, SITE_LOGO_CACHE_BUST } from '@/data/site'
import '@/styles/NotFound.css'

const LINKS = [
  { to: '/arcade', label: 'Arcade', icon: Gamepad2, desc: 'All games' },
  { to: '/guess-song', label: 'Daily Song Guess', icon: Music2, desc: "Today's puzzle" },
  { to: '/fan-profile', label: 'Fan Profile', icon: Sparkles, desc: 'Build your card' },
]

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found__card">
        <img
          className="not-found__logo"
          src={`${SITE_LOGOS.white}?v=${SITE_LOGO_CACHE_BUST}`}
          alt=""
          width={120}
          height={40}
        />
        <p className="not-found__code" aria-hidden="true">
          404
        </p>
        <h1 className="not-found__title">This page wandered off</h1>
        <p className="not-found__lead">
          Nothing lives at this URL on{' '}
          <span className="not-found__domain">skzarcade.com</span>. Pick a game or
          head home so you are not stuck here.
        </p>

        <div className="not-found__actions">
          <Link to="/" className="not-found__btn not-found__btn--primary">
            <Compass size={18} aria-hidden="true" />
            Home
          </Link>
          <Link to="/arcade" className="not-found__btn not-found__btn--secondary">
            <Gamepad2 size={18} aria-hidden="true" />
            Arcade
          </Link>
        </div>

        <ul className="not-found__links">
          {LINKS.map(({ to, label, icon: Icon, desc }) => (
            <li key={to}>
              <Link to={to} className="not-found__link">
                <span className="not-found__link-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="not-found__link-text">
                  <span className="not-found__link-label">{label}</span>
                  <span className="not-found__link-desc">{desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
