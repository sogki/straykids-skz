import { Link } from 'react-router-dom'
import { LegalDocument, LegalSection } from '@/components/legal/LegalDocument'
import '@/styles/LegalPage.css'

const UPDATED = '2026-05-28'

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'collect', label: 'What we collect' },
  { id: 'use', label: 'How we use it' },
  { id: 'storage', label: 'Storage & retention' },
  { id: 'third-party', label: 'Third parties' },
  { id: 'local', label: 'Cookies & local storage' },
  { id: 'rights', label: 'Your choices & rights' },
  { id: 'children', label: 'Children' },
  { id: 'international', label: 'International visitors' },
  { id: 'changes', label: 'Changes' },
  { id: 'contact', label: 'Contact' },
]

export default function Privacy() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="How SKZ Arcade handles information when you play games, appear on leaderboards, use the fan profile builder, or contact us."
      updated={UPDATED}
      toc={TOC}
    >
      <LegalSection id="overview" title="1. Overview">
        <p>
          SKZ Arcade (skzarcade.com) is a fan-operated website. This policy explains what
          information we collect, why we collect it, and what choices you have. For site rules,
          see our <Link to="/terms">Terms of Use</Link>.
        </p>
        <p className="legal-doc__callout">
          We do not sell your personal information. We collect only what we need to run games,
          leaderboards, basic analytics, and respond to your requests.
        </p>
      </LegalSection>

      <LegalSection id="collect" title="2. What we collect">
        <h3>Analytics (automatic)</h3>
        <p>When you browse or play, we may record:</p>
        <ul>
          <li>
            <strong>Event type</strong> — e.g. page view, game start, game complete (and
            separate events for unlimited practice modes).
          </li>
          <li>
            <strong>Path & game</strong> — which page or game slug was involved.
          </li>
          <li>
            <strong>Session id</strong> — a random identifier stored in your browser&apos;s{' '}
            <code>localStorage</code> to group visits (not your name).
          </li>
          <li>
            <strong>Country code</strong> — inferred from your browser locale when available
            (coarse location, not precise GPS).
          </li>
          <li>
            <strong>Metadata</strong> — optional non-identifying details about the round (e.g.
            score, attempts) attached to analytics events.
          </li>
        </ul>

        <h3>Leaderboard (when you submit)</h3>
        <ul>
          <li>
            <strong>Display name</strong> you enter, <strong>game</strong>, <strong>score</strong>
            / result fields, <strong>country</strong> (from locale), and <strong>timestamp</strong>.
          </li>
          <li>We do <strong>not</strong> require an email or account for leaderboard entries.</li>
        </ul>

        <h3>Fan profile builder</h3>
        <p>
          Card text and images you add are processed in your browser for preview and export. We do
          not upload your fan profile card to our servers unless a future feature clearly states
          otherwise.
        </p>

        <h3>Contact form</h3>
        <ul>
          <li>
            <strong>Name, email, message</strong>, request type, optional subject, and the page
            URL you submitted from.
          </li>
          <li>Used only to respond to corrections, takedowns, privacy requests, or feedback.</li>
        </ul>

        <h3>What we do not collect on the public site</h3>
        <ul>
          <li>No payment or shipping information (the site is free).</li>
          <li>No Discord login on skzarcade.com for general visitors.</li>
          <li>
            No precise geolocation, contacts, or device advertising IDs for the features described
            above.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="use" title="3. How we use information">
        <ul>
          <li>Operate daily puzzles, unlimited modes, and game state stored on your device.</li>
          <li>Display and moderate public leaderboards.</li>
          <li>Measure aggregate traffic and game popularity to improve the site.</li>
          <li>Respond to contact requests and legal or rights-holder concerns.</li>
          <li>Protect against abuse, spam, and technical issues.</li>
        </ul>
        <p>
          Site operators with authorized admin access may view analytics and contact submissions
          in a protected admin area. That access is separate from public gameplay and is limited
          to trusted staff.
        </p>
      </LegalSection>

      <LegalSection id="storage" title="4. Storage & retention">
        <p>
          Data is stored using Supabase (hosted database infrastructure). We keep information
          only as long as needed for the purposes above, unless a longer period is required by
          law or to resolve disputes.
        </p>
        <ul>
          <li>Analytics events may be retained in aggregate for trend analysis.</li>
          <li>Leaderboard entries may remain visible until removed by admins or reset.</li>
          <li>Contact messages are retained so we can follow up and demonstrate good-faith handling of requests.</li>
        </ul>
      </LegalSection>

      <LegalSection id="third-party" title="5. Third parties">
        <p>
          <strong>Supabase</strong> processes data on our behalf as infrastructure provider. Their
          privacy practices apply to how they operate the platform.
        </p>
        <p>
          <strong>Hosting & CDN</strong> (e.g. Vercel or similar) may process technical logs
          (IP address, user agent) standard for any website.
        </p>
        <p>
          <strong>External links</strong> (Discord, YouTube, Spotify, etc.) are not controlled by
          SKZ Arcade. Review their policies when you leave our site.
        </p>
      </LegalSection>

      <LegalSection id="local" title="6. Cookies & local storage">
        <p>
          We use browser <strong>local storage</strong> for items such as:
        </p>
        <ul>
          <li>Analytics session id (<code>skz_analytics_session</code>)</li>
          <li>Daily puzzle progress and streak-related keys per game</li>
          <li>Dismissed site banners and app update notices</li>
          <li>Game settings (e.g. memory match preferences)</li>
        </ul>
        <p>
          You can clear site data through your browser settings. Doing so may reset progress or
          generate a new analytics session id.
        </p>
        <p>
          We do not use third-party advertising cookies on SKZ Arcade as described in this
          policy.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="7. Your choices & rights">
        <p>You can:</p>
        <ul>
          <li>Play without submitting a leaderboard name.</li>
          <li>Clear local storage or use private browsing (with the trade-offs above).</li>
          <li>
            Ask us to correct or delete data you submitted via the{' '}
            <Link to="/contact">contact form</Link> — choose <strong>Privacy inquiry</strong> or
            the type that fits (e.g. data correction).
          </li>
        </ul>
        <p>
          Depending on where you live, you may have additional rights (access, portability,
          objection). We will respond to reasonable requests within a practical timeframe.
        </p>
      </LegalSection>

      <LegalSection id="children" title="8. Children">
        <p>
          SKZ Arcade is intended for a general audience of fans. We do not knowingly collect
          personal information from children under 13. If you believe a child provided personal
          data through our contact form, contact us and we will take appropriate steps to delete
          it.
        </p>
        <p>Users under 13 should use the site with a parent or guardian.</p>
      </LegalSection>

      <LegalSection id="international" title="9. International visitors">
        <p>
          The site may be accessed from many countries. Data may be processed in regions where our
          hosting providers operate. By using SKZ Arcade, you understand that your information may
          be transferred and stored outside your home country, subject to applicable safeguards
          offered by our providers.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. Changes">
        <p>
          We may update this policy. The date at the top shows the current version. Significant
          changes may be highlighted on the site when practical. Continued use after updates means
          you accept the revised policy.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="11. Contact">
        <p>
          Privacy questions or deletion requests:{' '}
          <Link to="/contact">Contact & requests</Link> and select <strong>Privacy inquiry</strong>.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
