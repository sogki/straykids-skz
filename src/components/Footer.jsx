import { Link } from 'react-router-dom'
import { Coffee } from 'lucide-react'
import { useSkzData } from '@/context/SkzDataContext'
import SiteLogo from '@/components/SiteLogo'
import { DISCORD_INVITE, DISCORD_LABEL, SUPPORT_LABEL, SUPPORT_URL } from '@/data/site'
import '@/styles/Footer.css'
import '@/styles/SiteLogo.css'
import '@/styles/pattern-bar.css'

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 12.3 12.3 0 0 0-.608 1.25 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

export default function Footer() {
  const { settings, games } = useSkzData()
  const creator = settings?.creator_name || 'sogki'
  const creatorUrl = settings?.creator_url || 'https://sogki.dev'
  const year = new Date().getFullYear()
  const title = settings?.site_title || 'SKZ Arcade'

  return (
    <footer className="skz-footer mt-auto">
      <div className="skz-footer__outer">
        <div className="skz-footer__frame">
          <div className="grid grid-cols-1 gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_0.85fr_0.85fr] lg:gap-10 lg:px-10">
            <div className="max-w-md">
              <div className="skz-footer__logo">
                <SiteLogo
                  variant="white"
                  className="skz-footer__logo-link"
                  imgClassName="site-logo__img--footer"
                />
              </div>
              <p className="text-sm leading-relaxed text-skz-muted">
                Fan-made daily puzzles and minigames for STAYs. Not affiliated
                with JYP Entertainment or Stray Kids.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <a
                  href={DISCORD_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-skz-border bg-skz-bg text-skz-muted transition-colors hover:border-[#5865F2]/50 hover:text-[#5865F2]"
                  aria-label={`${DISCORD_LABEL} on Discord`}
                >
                  <DiscordIcon />
                </a>
                {SUPPORT_URL ? (
                  <a
                    href={SUPPORT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="skz-footer__social-icon skz-footer__social-icon--coffee inline-flex h-9 w-9 items-center justify-center rounded-md border border-skz-border bg-skz-bg text-skz-muted transition-colors"
                    aria-label={`${SUPPORT_LABEL} on Buy Me a Coffee`}
                  >
                    <Coffee size={18} strokeWidth={2} aria-hidden="true" />
                  </a>
                ) : null}
              </div>
              <nav className="skz-footer__legal-links" aria-label="Legal">
                <Link to="/terms" className="skz-footer__legal-link">
                  Terms
                </Link>
                <span className="skz-footer__legal-sep" aria-hidden="true">
                  ·
                </span>
                <Link to="/privacy" className="skz-footer__legal-link">
                  Privacy
                </Link>
                <span className="skz-footer__legal-sep" aria-hidden="true">
                  ·
                </span>
                <Link to="/contact" className="skz-footer__legal-link">
                  Contact
                </Link>
              </nav>
            </div>

            <div>
              <h3 className="skz-footer__col-title">Games</h3>
              <ul className="skz-footer__links">
                <li>
                  <Link to="/arcade" className="skz-footer__link">
                    Browse arcade
                  </Link>
                </li>
                {(games ?? []).map((game) => (
                  <li key={game.id}>
                    <Link to={game.path} className="skz-footer__link">
                      {game.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="skz-footer__col-title">Discord</h3>
              <p className="mb-3 text-sm leading-relaxed text-skz-muted">
                Hang out with other STAYs on {DISCORD_LABEL}.
              </p>
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="skz-footer__link skz-footer__link--discord inline-flex items-center gap-2"
              >
                <DiscordIcon />
                Join server
              </a>
            </div>

            {SUPPORT_URL ? (
              <div>
                <h3 className="skz-footer__col-title">Support</h3>
                <p className="mb-3 text-sm leading-relaxed text-skz-muted">
                  Enjoy SKZ Arcade? A coffee helps keep new games and puzzles
                  coming.
                </p>
                <a
                  href={SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="skz-footer__link skz-footer__link--coffee inline-flex items-center gap-2"
                >
                  <Coffee size={16} strokeWidth={2} aria-hidden="true" />
                  {SUPPORT_LABEL}
                </a>
              </div>
            ) : null}
          </div>

          <div className="skz-footer__bottom">
            <div className="skz-pattern-bar skz-pattern-bar--bottom skz-pattern-bar--footer">
              <div className="skz-footer__legal px-6 py-4 lg:px-10">
                <div className="flex flex-col gap-2 text-xs text-skz-muted sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    © {year} {title}. Fan project. Not affiliated with JYP or
                    Stray Kids.
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Built by{' '}
                      <a
                        href={creatorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:underline"
                      >
                        {creator}
                      </a>
                    </span>
                    {SUPPORT_URL ? (
                      <a
                        href={SUPPORT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="skz-footer__legal-support hover:text-white hover:underline"
                      >
                        {SUPPORT_LABEL}
                      </a>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
