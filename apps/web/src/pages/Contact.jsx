import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { submitSiteRequest } from '@/services/skzRequests'
import { LegalDocument, LegalSection } from '@/components/legal/LegalDocument'
import '@/styles/LegalPage.css'

const REQUEST_TYPES = [
  { value: 'data_correction', label: 'Data correction (wrong puzzle/lyric/trivia)' },
  { value: 'takedown', label: 'Takedown / copyright concern' },
  { value: 'privacy', label: 'Privacy inquiry' },
  { value: 'general', label: 'General feedback' },
  { value: 'other', label: 'Other' },
]

const TOC = [
  { id: 'before', label: 'Before you write' },
  { id: 'form', label: 'Submit a request' },
]

export default function Contact() {
  const { pathname } = useLocation()
  const [form, setForm] = useState({
    requestType: 'general',
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      await submitSiteRequest({
        requestType: form.requestType,
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
        pageUrl: typeof window !== 'undefined' ? window.location.href : pathname,
      })
      setStatus('sent')
      setForm({
        requestType: form.requestType,
        name: '',
        email: '',
        subject: '',
        message: '',
      })
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Could not send request. Try again later.')
    }
  }

  return (
    <LegalDocument
      title="Contact & requests"
      description="Report incorrect puzzle data, request a takedown, or ask a privacy question. Submissions go to the site team and appear in our admin inbox."
      updated="2026-05-28"
      toc={TOC}
    >
      <LegalSection id="before" title="Before you write">
        <ul>
          <li>
            <strong>Data correction:</strong> include the game, date if known, and what should
            change.
          </li>
          <li>
            <strong>Takedown:</strong> describe the content and your relationship to the rights
            (if applicable).
          </li>
          <li>
            <strong>Privacy:</strong> say what data you want accessed, corrected, or deleted.
          </li>
        </ul>
        <p>
          Read our <Link to="/terms">Terms of Use</Link> and <Link to="/privacy">Privacy Policy</Link>{' '}
          for how we handle submissions and site data.
        </p>
      </LegalSection>

      <LegalSection id="form" title="Submit a request">
        {status === 'sent' ? (
          <p className="legal-contact-form__msg legal-contact-form__msg--ok">
            Thanks — your request was received. We will review it as soon as we can.
          </p>
        ) : (
          <form className="legal-contact-form" onSubmit={handleSubmit}>
            <label>
              Request type
              <select
                value={form.requestType}
                onChange={(e) => update('requestType', e.target.value)}
                required
              >
                {REQUEST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Your name
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                autoComplete="name"
                required
                maxLength={120}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label>
              Subject (optional)
              <input
                type="text"
                value={form.subject}
                onChange={(e) => update('subject', e.target.value)}
                maxLength={200}
              />
            </label>

            <label>
              Message
              <textarea
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
                required
                minLength={10}
                maxLength={8000}
              />
            </label>

            {error && (
              <p className="legal-contact-form__msg legal-contact-form__msg--err">{error}</p>
            )}

            <button
              type="submit"
              className="legal-contact-form__submit"
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'Sending…' : 'Submit request'}
            </button>
          </form>
        )}
      </LegalSection>
    </LegalDocument>
  )
}
