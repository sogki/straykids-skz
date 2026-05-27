/**
 * Scrape all Stray Kids gallery images from straykids.jype.com/Default/Gallery
 * (all pagination pages) and write src/data/strayKidsGallery.generated.json
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const GALLERY_BASE = 'https://straykids.jype.com/Default/Gallery'
const CDN_GALLERY = 'https://d1al7qj7ydfbpt.cloudfront.net/artists/straykids/galleries/'

const root = join(fileURLToPath(new URL('..', import.meta.url)))
const outFile = join(root, 'src', 'data', 'strayKidsGallery.generated.json')

function slugify(text, index) {
  const base = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80)
  return base || `gallery-${index}`
}

const JYPE_IMAGE_RE =
  /https:\/\/d1al7qj7ydfbpt\.cloudfront\.net\/artists?\/straykids\/[^"'\s\\]+\.(?:jpg|jpeg|png|webp)/gi

function isGalleryPhotoUrl(url) {
  if (!/\/straykids\//i.test(url)) return false
  if (/\/main\//i.test(url)) return false
  if (/\/albums\//i.test(url)) return false
  return true
}

function parseGalleryPage(html) {
  const byUrl = new Map()

  const pairRe =
    /href\\":\\"(https:\/\/d1al7qj7ydfbpt\.cloudfront\.net\/artists?\/straykids\/[^"\\]+)\\"[^]*?alt\\":\\"([^"\\]*)\\"/g
  let match
  while ((match = pairRe.exec(html)) !== null) {
    const jypeUrl = match[1]
    if (!isGalleryPhotoUrl(jypeUrl)) continue
    const alt = match[2].trim()
    if (!byUrl.has(jypeUrl) || (alt && alt !== 'Gallery image')) {
      byUrl.set(jypeUrl, alt || byUrl.get(jypeUrl) || '')
    }
  }

  const srcPairRe =
    /\\"src\\":\\"(https:\/\/d1al7qj7ydfbpt\.cloudfront\.net\/artists?\/straykids\/[^"\\]+)\\"[^]*?\\"alt\\":\\"([^"\\]*)\\"/g
  while ((match = srcPairRe.exec(html)) !== null) {
    const jypeUrl = match[1]
    if (!isGalleryPhotoUrl(jypeUrl)) continue
    const alt = match[2].trim()
    if (!byUrl.has(jypeUrl) || (alt && alt !== 'Gallery image')) {
      byUrl.set(jypeUrl, alt || byUrl.get(jypeUrl) || '')
    }
  }

  for (const jypeUrl of html.match(JYPE_IMAGE_RE) || []) {
    if (!isGalleryPhotoUrl(jypeUrl)) continue
    if (!byUrl.has(jypeUrl)) {
      const file = decodeURIComponent(jypeUrl.split('/').pop())
      byUrl.set(jypeUrl, file.replace(/\.[a-z]+$/i, ''))
    }
  }

  return [...byUrl.entries()].map(([jypeUrl, name]) => ({
    name: name || 'Gallery photo',
    jypeUrl,
  }))
}

function parseTotalPages(html) {
  const emTotal = html.match(/children\\":1\}[^]*?children\\":(\d+)/)
  if (emTotal) return Number(emTotal[1])
  const pageLinks = [...html.matchAll(/Gallery\?PgIndex=(\d+)/g)].map((x) =>
    Number(x[1])
  )
  if (pageLinks.length) return Math.max(...pageLinks)
  return null
}

async function fetchPage(page) {
  const url = page === 1 ? GALLERY_BASE : `${GALLERY_BASE}?PgIndex=${page}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SKZ-Arcade-Gallery-Sync/1.0 (fan profile builder)' },
  })
  if (!res.ok) throw new Error(`Page ${page}: HTTP ${res.status}`)
  return res.text()
}

async function main() {
  console.log('Fetching gallery page 1…')
  const firstHtml = await fetchPage(1)
  let totalPages = parseTotalPages(firstHtml)
  if (!totalPages) {
    totalPages = 46
    console.warn('Could not detect page count; using 46')
  }
  console.log(`Gallery has ${totalPages} page(s)`)

  const all = []
  const seenUrls = new Set()
  const idCounts = new Map()

  function addItems(items) {
    for (const { name, jypeUrl } of items) {
      if (seenUrls.has(jypeUrl)) continue
      seenUrls.add(jypeUrl)
      const label =
        name && name !== 'Gallery image'
          ? name.replace(/\.(jpe?g|png|webp)$/i, '')
          : decodeURIComponent(jypeUrl.split('/').pop()).replace(/\.[a-z]+$/i, '')
      const baseSlug = slugify(label, all.length)
      const count = (idCounts.get(baseSlug) ?? 0) + 1
      idCounts.set(baseSlug, count)
      const id = count === 1 ? baseSlug : `${baseSlug}-${count}`
      all.push({ id, name, jypeUrl })
    }
  }

  addItems(parseGalleryPage(firstHtml))

  for (let page = 2; page <= totalPages; page += 1) {
    process.stdout.write(`\rFetching page ${page}/${totalPages}…`)
    const html = await fetchPage(page)
    addItems(parseGalleryPage(html))
    await new Promise((r) => setTimeout(r, 120))
  }
  process.stdout.write('\n')

  const manifest = {
    source: GALLERY_BASE,
    fetchedAt: new Date().toISOString(),
    totalPages,
    count: all.length,
    photos: all,
  }

  await writeFile(outFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${all.length} photos → ${outFile}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
