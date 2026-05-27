import { Link } from 'react-router-dom'
import '@/styles/LegalPage.css'

export default function Terms() {
  return (
    <article className="legal-page">
      <h1>Terms of Use</h1>
      <p className="legal-page__lead">
        SKZ Arcade is a fan-made site for STAYs. By using this site you agree to these terms.
        Last updated: May 2026.
      </p>

      <section>
        <h2>Fan project</h2>
        <p>
          SKZ Arcade is not affiliated with, endorsed by, or connected to JYP Entertainment,
          Stray Kids, or their management. Stray Kids names, images, and related marks belong to
          their respective owners.
        </p>
      </section>

      <section>
        <h2>Your use</h2>
        <ul>
          <li>Use the site for personal, non-commercial entertainment.</li>
          <li>Do not attempt to break, scrape, or overload the service.</li>
          <li>Do not submit false or abusive content through our forms.</li>
          <li>Leaderboard and profile features must not be used to harass others.</li>
        </ul>
      </section>

      <section>
        <h2>Content & accuracy</h2>
        <p>
          Puzzles, lyrics, and trivia are created by fans and may contain errors. We do not
          guarantee accuracy. If you spot incorrect information, please use our{' '}
          <Link to="/contact">contact form</Link> (data correction).
        </p>
      </section>

      <section>
        <h2>Disclaimer</h2>
        <p>
          The site is provided “as is” without warranties. We are not liable for any damages
          arising from your use of the site.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms. Continued use after changes means you accept the updated
          terms.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms: <Link to="/contact">Contact & requests</Link>.
        </p>
      </section>
    </article>
  )
}
