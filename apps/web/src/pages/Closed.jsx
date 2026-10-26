import { SITE_LOGOS, SITE_LOGO_CACHE_BUST, SUPPORT_URL } from '@/data/site'
import '@/styles/Closed.css'

export default function Closed() {
  return (
    <main className="closed">
      <div className="closed__sky" aria-hidden="true">
        <span className="closed__bloom closed__bloom--a" />
        <span className="closed__bloom closed__bloom--b" />
        <span className="closed__bloom closed__bloom--c" />
        <span className="closed__ring" />
        <span className="closed__spark closed__spark--1" />
        <span className="closed__spark closed__spark--2" />
        <span className="closed__spark closed__spark--3" />
        <span className="closed__spark closed__spark--4" />
        <span className="closed__spark closed__spark--5" />
        <span className="closed__spark closed__spark--6" />
      </div>
      <div className="closed__grain" aria-hidden="true" />
      <div className="closed__vignette" aria-hidden="true" />

      <div className="closed__content">
        <img
          className="closed__logo"
          src={`${SITE_LOGOS.white}?v=${SITE_LOGO_CACHE_BUST}`}
          alt="SKZ Arcade"
          width={220}
          height={72}
        />

        <div className="closed__rule" aria-hidden="true" />

        <h1 className="closed__title">
          Thanks for
          <span className="closed__title-em"> playing</span>
        </h1>
        <p className="closed__lead">
          SKZ Arcade is closing its doors. The daily puzzles and minigames are
          no longer available — thank you for all the love and play along the
          way.
        </p>

        <div className="closed__actions">
          <a
            className="closed__btn closed__btn--primary"
            href="https://sogki.dev"
            rel="noopener noreferrer"
          >
            More from sogki
          </a>
          <a
            className="closed__btn closed__btn--ghost"
            href={SUPPORT_URL}
            rel="noopener noreferrer"
          >
            Buy me a coffee
          </a>
        </div>
      </div>
    </main>
  )
}
