import { Link } from 'react-router-dom'
import { LegalDocument, LegalSection } from '@/components/legal/LegalDocument'
import '@/styles/LegalPage.css'

const UPDATED = '2026-05-28'

const TOC = [
  { id: 'agreement', label: 'Agreement' },
  { id: 'about', label: 'About SKZ Arcade' },
  { id: 'use', label: 'Acceptable use' },
  { id: 'features', label: 'Games & features' },
  { id: 'submissions', label: 'Your submissions' },
  { id: 'ip', label: 'Intellectual property' },
  { id: 'third-party', label: 'Third-party services' },
  { id: 'disclaimer', label: 'Disclaimers' },
  { id: 'liability', label: 'Limitation of liability' },
  { id: 'changes', label: 'Changes' },
  { id: 'contact', label: 'Contact' },
]

export default function Terms() {
  return (
    <LegalDocument
      title="Terms of Use"
      description="Rules for using SKZ Arcade (skzarcade.com) — fan-made Stray Kids puzzles, minigames, and community tools for STAYs."
      updated={UPDATED}
      toc={TOC}
    >
      <LegalSection id="agreement" title="1. Agreement">
        <p>
          By accessing or using SKZ Arcade, you agree to these Terms of Use and our{' '}
          <Link to="/privacy">Privacy Policy</Link>. If you do not agree, please do not use the
          site.
        </p>
        <p className="legal-doc__callout">
          SKZ Arcade is operated as a non-commercial fan project. It is not a substitute for
          professional advice and does not create a contractual relationship beyond these terms.
        </p>
      </LegalSection>

      <LegalSection id="about" title="2. About SKZ Arcade">
        <p>
          SKZ Arcade is an independent, fan-made website for STAYs. We are{' '}
          <strong>not affiliated with, endorsed by, or sponsored by</strong> JYP Entertainment,
          Stray Kids, or their management companies.
        </p>
        <p>
          Stray Kids names, likenesses, audio clips used in games, album art, and related marks
          are the property of their respective owners. We do not claim ownership of third-party
          intellectual property displayed on the site.
        </p>
      </LegalSection>

      <LegalSection id="use" title="3. Acceptable use">
        <p>You agree to use the site only for lawful, personal, non-commercial entertainment. You must not:</p>
        <ul>
          <li>Attempt to break, scrape, overload, or reverse-engineer the service or its APIs.</li>
          <li>Use bots or automation to manipulate leaderboards or analytics.</li>
          <li>Submit false, harassing, or abusive content through our forms or display names.</li>
          <li>Use leaderboard or community features to target, impersonate, or harass others.</li>
          <li>Redistribute site content or game assets for commercial use without permission.</li>
        </ul>
        <p>
          We may restrict access or remove content that violates these rules or harms the
          community, without prior notice where appropriate.
        </p>
      </LegalSection>

      <LegalSection id="features" title="4. Games & features">
        <h3>Daily & unlimited modes</h3>
        <p>
          Many games offer a daily puzzle and optional unlimited practice. Daily results may
          affect public leaderboards; unlimited modes are tracked separately and do not rank on
          the main leaderboard unless stated otherwise in the game.
        </p>
        <h3>Leaderboard</h3>
        <p>
          If you submit a score, you choose a display name shown publicly with your result,
          country (derived from your browser locale), game, and performance metadata. Do not
          use names that impersonate others or contain slurs or personal data you do not want
          published.
        </p>
        <h3>Fan profile card</h3>
        <p>
          The fan profile builder runs largely in your browser. Exported images are your
          responsibility; we do not host a public profile gallery unless a feature explicitly
          says otherwise.
        </p>
        <h3>Accuracy</h3>
        <p>
          Puzzles, lyrics, trivia, and media metadata are curated by fans and may contain
          errors. We do not guarantee completeness or accuracy. Report mistakes via our{' '}
          <Link to="/contact">contact form</Link>.
        </p>
      </LegalSection>

      <LegalSection id="submissions" title="5. Your submissions">
        <p>
          When you contact us (corrections, takedowns, feedback), you provide information
          voluntarily. You represent that your message is truthful to the best of your knowledge
          and that you have the right to submit any material you attach or describe.
        </p>
        <p>
          We may use submissions to operate, improve, or protect the site, including fixing
          puzzle data or responding to rights-holder concerns.
        </p>
      </LegalSection>

      <LegalSection id="ip" title="6. Intellectual property">
        <p>
          Original site design, code, and fan-created puzzle content on SKZ Arcade are protected
          by applicable law. You may not copy, modify, or republish substantial portions without
          permission, except as allowed by law (e.g. fair use) or with attribution where we
          explicitly permit sharing.
        </p>
        <p>
          Copyright or trademark owners who believe content on SKZ Arcade infringes their rights
          should contact us with a <strong>takedown request</strong> via the{' '}
          <Link to="/contact">contact form</Link>, including enough detail for us to locate and
          review the material.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="7. Third-party services">
        <p>
          The site relies on hosted infrastructure (including Supabase) and may link to Discord,
          streaming platforms, or other external sites. Those services have their own terms and
          privacy policies. We are not responsible for third-party sites you visit from SKZ
          Arcade.
        </p>
        <p>
          Community Discord servers (for example Stay Café) are separate from SKZ Arcade. Bot
          commands or admin tools on Discord are governed by Discord&apos;s terms and that
          server&apos;s rules, not these website terms alone.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" title="8. Disclaimers">
        <p>
          SKZ Arcade is provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong>{' '}
          without warranties of any kind, whether express or implied, including fitness for a
          particular purpose, accuracy, or uninterrupted availability.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="9. Limitation of liability">
        <p>
          To the fullest extent permitted by law, the operators of SKZ Arcade will not be liable
          for any indirect, incidental, special, consequential, or punitive damages, or any loss
          of data, profits, or goodwill, arising from your use of the site.
        </p>
        <p>
          Our total liability for any claim relating to the site will not exceed the greater of
          zero or the amount you paid us to use the site (typically zero, as the site is free).
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. Changes">
        <p>
          We may update these terms from time to time. The &quot;Last updated&quot; date at the top
          reflects the current version. Continued use after changes are posted means you accept
          the updated terms. Material changes may also be noted on the site when practical.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="11. Contact">
        <p>
          Questions about these terms: <Link to="/contact">Contact & requests</Link> and choose
          the request type that best fits your message.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
