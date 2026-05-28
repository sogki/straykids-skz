import { Link } from 'react-router-dom'

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} [props.updated]
 * @param {{ id: string, label: string }[]} [props.toc]
 * @param {import('react').ReactNode} props.children
 */
export function LegalDocument({ title, description, updated, toc = [], children }) {
  return (
    <article className="legal-doc">
      <header className="legal-doc__header">
        <p className="legal-doc__eyebrow">Legal</p>
        <h1 className="legal-doc__title">{title}</h1>
        <p className="legal-doc__description">{description}</p>
        {updated ? (
          <p className="legal-doc__meta">
            <span className="legal-doc__meta-label">Last updated</span>
            <time dateTime={updated}>{updated}</time>
          </p>
        ) : null}
      </header>

      <div className={toc.length > 0 ? 'legal-doc__body legal-doc__body--with-toc' : 'legal-doc__body'}>
        {toc.length > 0 ? (
          <nav className="legal-doc__toc" aria-label="On this page">
            <p className="legal-doc__toc-heading">On this page</p>
            <ol className="legal-doc__toc-list">
              {toc.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="legal-doc__content">{children}</div>
      </div>

      <footer className="legal-doc__footer">
        <p className="legal-doc__footer-title">Related</p>
        <ul className="legal-doc__footer-links">
          <li>
            <Link to="/terms">Terms of Use</Link>
          </li>
          <li>
            <Link to="/privacy">Privacy Policy</Link>
          </li>
          <li>
            <Link to="/contact">Contact & requests</Link>
          </li>
        </ul>
      </footer>
    </article>
  )
}

/**
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.title
 * @param {import('react').ReactNode} [props.children]
 */
export function LegalSection({ id, title, children }) {
  return (
    <section id={id} className="legal-doc__section" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="legal-doc__section-title">
        {title}
      </h2>
      <div className="legal-doc__section-body">{children}</div>
    </section>
  )
}
