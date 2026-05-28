import { Link } from 'react-router-dom'
import { Coffee } from 'lucide-react'
import { useSkzData } from '@/context/SkzDataContext'
import SiteLogo from '@/components/SiteLogo'
import { DISCORD_INVITE, DISCORD_LABEL, SUPPORT_LABEL, SUPPORT_URL } from '@/data/site'
import '@/styles/Footer.css'
import '@/styles/SiteLogo.css'
import DiscordIcon from '@/components/DiscordIcon'
import '@/styles/pattern-bar.css'

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
                  <DiscordIcon size={18} />
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
                <DiscordIcon size={18} />
                Join server
              </a>
            </div>

            {SUPPORT_URL ? (
              <div>
                <h3 className="skz-footer__col-title">Support</h3>
                <p className="mb-3 text-sm leading-relaxed text-skz-muted">
                  Enjoy the SKZ Arcade? A coffee helps keep new games and puzzles
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
