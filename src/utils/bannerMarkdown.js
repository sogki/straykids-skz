/**
 * Safe subset of markdown for site banner messages (no raw HTML).
 * Supports: **bold**, *italic*, `code`, [text](url)
 */

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sanitizeHref(href) {
  const trimmed = href.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  if (trimmed.startsWith('#')) return trimmed
  return null
}

/**
 * @returns {{ html: string, plain: string }}
 */
export function parseBannerMarkdown(source) {
  if (!source?.trim()) {
    return { html: '', plain: '' }
  }

  let text = escapeHtml(source.trim())

  text = text.replace(/`([^`]+)`/g, '<code class="site-banner__code">$1</code>')
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label, href) => {
      const safe = sanitizeHref(href)
      if (!safe) return label
      const external = /^https?:\/\//i.test(safe)
      const rel = external ? ' rel="noopener noreferrer"' : ''
      const target = external ? ' target="_blank"' : ''
      return `<a href="${safe}" class="site-banner__inline-link"${target}${rel}>${label}</a>`
    }
  )

  const plain = source
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')

  return { html: text, plain }
}
