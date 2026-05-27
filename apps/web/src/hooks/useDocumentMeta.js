import { useEffect } from 'react'
import { SITE_NAME, SITE_OG_IMAGE, absoluteSiteUrl } from '@/data/site'
import { buildRouteJsonLd, formatDocumentTitle } from '@/data/routeSeo'

const MANAGED = []

function upsertMeta(attr, key, content, isProperty = false) {
  if (!content) return
  const selector = isProperty
    ? `meta[property="${key}"]`
    : `meta[${attr}="${key}"]`
  let el = document.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    if (isProperty) el.setAttribute('property', key)
    else el.setAttribute(attr, key)
    document.head.appendChild(el)
    MANAGED.push(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  if (!href) return
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
    MANAGED.push(el)
  }
  el.setAttribute('href', href)
}

function upsertJsonLd(id, data) {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
    MANAGED.push(el)
  }
  el.textContent = JSON.stringify(data)
}

/**
 * Per-route title, description, and Open Graph tags (skzarcade.com).
 */
export function useDocumentMeta({
  title,
  description,
  path = '/',
  image = SITE_OG_IMAGE,
  type = 'website',
  keywords,
  noindex = false,
}) {
  useEffect(() => {
    const fullTitle = formatDocumentTitle(title)
    const url = absoluteSiteUrl(path)

    document.title = fullTitle
    upsertMeta('name', 'description', description)
    if (keywords) upsertMeta('name', 'keywords', keywords)

    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')

    upsertMeta('property', 'og:locale', 'en_GB', true)
    upsertMeta('property', 'og:title', fullTitle, true)
    upsertMeta('property', 'og:description', description, true)
    upsertMeta('property', 'og:url', url, true)
    upsertMeta('property', 'og:image', image, true)
    upsertMeta('property', 'og:image:secure_url', image, true)
    upsertMeta('property', 'og:image:width', '1200', true)
    upsertMeta('property', 'og:image:height', '630', true)
    upsertMeta('property', 'og:image:alt', `${SITE_NAME} — Stray Kids fan arcade`, true)
    upsertMeta('property', 'og:type', type, true)
    upsertMeta('property', 'og:site_name', SITE_NAME, true)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', image)
    upsertMeta('name', 'twitter:image:alt', `${SITE_NAME} preview`)

    upsertLink('canonical', url)
    upsertJsonLd('skz-route-jsonld', buildRouteJsonLd({ path, title, description }))
  }, [title, description, path, image, type, keywords, noindex])
}
