/**
 * Writes dist/<route>/index.html with closed-site meta so old shared links
 * preview as offline (Discord, iMessage, X, etc.).
 *
 * Run after vite build: node scripts/prerender-route-html.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')
const indexPath = path.join(distDir, 'index.html')

const SITE_ORIGIN = (
  process.env.VITE_SITE_URL?.trim() || 'https://skzarcade.com'
).replace(/\/$/, '')
const OG_IMAGE = `${SITE_ORIGIN}/og/skz-arcade.png`

const CLOSED = {
  title: 'SKZ Arcade — Closed',
  description:
    'The arcade has closed. Thanks for playing — games and APIs are offline permanently.',
}

/** Old paths still get a closed OG preview when someone shares a bookmark. */
const LEGACY_PATHS = [
  '/',
  '/arcade',
  '/leaderboard',
  '/guess-song',
  '/guess-member',
  '/guess-lyric',
  '/fan-profile',
  '/bias-quiz',
  '/memory-match',
  '/tier-list',
  '/higher-lower',
  '/audio-guess',
  '/terms',
  '/privacy',
  '/contact',
  '/profile',
  '/link',
  '/admin',
]

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function applyClosedMeta(html, routePath) {
  const url = `${SITE_ORIGIN}${routePath === '/' ? '/' : routePath}`
  const title = escapeHtml(CLOSED.title)
  const description = escapeHtml(CLOSED.description)
  const image = escapeHtml(OG_IMAGE)

  let out = html
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
  out = out.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${description}"`
  )
  out = out.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${url}"`
  )
  out = out.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${title}"`
  )
  out = out.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${description}"`
  )
  out = out.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${url}"`
  )
  out = out.replace(
    /<meta property="og:image" content="[^"]*"/,
    `<meta property="og:image" content="${image}"`
  )
  out = out.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${title}"`
  )
  out = out.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${description}"`
  )
  out = out.replace(
    /<meta name="twitter:image" content="[^"]*"/,
    `<meta name="twitter:image" content="${image}"`
  )

  return out
}

if (!fs.existsSync(indexPath)) {
  console.error('Run vite build first — dist/index.html not found')
  process.exit(1)
}

const baseHtml = fs.readFileSync(indexPath, 'utf8')

for (const routePath of LEGACY_PATHS) {
  const html = applyClosedMeta(baseHtml, routePath)
  const outPath =
    routePath === '/'
      ? indexPath
      : path.join(distDir, routePath.slice(1), 'index.html')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, html)
  console.log(`  ${routePath} → ${path.relative(distDir, outPath)}`)
}

console.log(`Prerendered ${LEGACY_PATHS.length} closed routes for Open Graph crawlers.`)
