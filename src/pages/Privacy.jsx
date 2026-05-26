import { Link } from 'react-router-dom'
import '@/styles/LegalPage.css'

export default function Privacy() {
  return (
    <article className="legal-page">
      <h1>Privacy Policy</h1>
      <p className="legal-page__lead">
        How SKZ Arcade handles information when you play games, use the fan profile, or contact
        us. Last updated: May 2026.
      </p>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Gameplay & analytics:</strong> anonymous events (page views, game starts,
            completions) with a random session id stored in your browser.
          </li>
          <li>
            <strong>Leaderboard:</strong> if you submit a score, we store your display name,
            country (from your browser locale), game, and result — not your email.
          </li>
          <li>
            <strong>Fan profile:</strong> card data you enter is processed in your browser for
            export; we do not require an account to use it.
          </li>
          <li>
            <strong>Contact form:</strong> name, email, message, and request type when you
            submit a request.
          </li>
          <li>
            <strong>Local storage:</strong> daily puzzle progress, dismissed banners, and app
            version checks stay on your device.
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <p>
          To run daily puzzles, show leaderboards, improve the site, and respond to your
          requests (corrections, takedowns, privacy inquiries).
        </p>
      </section>

      <section>
        <h2>Third parties</h2>
        <p>
          We use Supabase for hosting data and may link to Discord or support pages. Those
          services have their own policies when you leave SKZ Arcade.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You may ask us to correct or delete data you submitted via the{' '}
          <Link to="/contact">contact form</Link>. We will process requests within a reasonable
          time.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          The site is intended for general audiences. If you are under 13, please use the site
          with a parent or guardian.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Privacy questions: <Link to="/contact">Contact & requests</Link> and choose
          “Privacy inquiry”.
        </p>
      </section>
    </article>
  )
}
