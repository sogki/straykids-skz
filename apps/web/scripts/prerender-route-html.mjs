/**
 * Writes dist/<route>/index.html with route-specific meta tags so link
 * previews work on Discord, iMessage, X, etc. (crawlers that skip JS).
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
const SITE_NAME = 'SKZ Arcade'
const OG_IMAGE = `${SITE_ORIGIN}/og/skz-arcade.png`

const ROUTES = [
  {
    path: '/',
    title: SITE_NAME,
    description:
      'Daily Stray Kids puzzles for STAYs — song, member, and lyric guesses, bias quiz, and fan profile maker.',
  },
  {
    path: '/arcade',
    title: 'Browse Arcade · SKZ Arcade',
    description: 'Browse all SKZ Arcade minigames for Stray Kids fans.',
  },
  {
    path: '/leaderboard',
    title: 'Leaderboard · SKZ Arcade',
    description:
      'Global player leaderboard and country rankings for daily Stray Kids puzzles.',
  },
  {
    path: '/guess-song',
    title: 'Daily Song Guess · SKZ Arcade',
    description:
      'Guess today’s Stray Kids track from emoji and lyric clues. Five tries, new puzzle every day.',
  },
  {
    path: '/guess-member',
    title: 'Daily Member Guess · SKZ Arcade',
    description: 'Guess which Stray Kids member matches today’s vibe clues.',
  },
  {
    path: '/guess-lyric',
    title: 'Daily Lyric Guess · SKZ Arcade',
    description: 'Fill in the blank in today’s Stray Kids lyric.',
  },
  {
    path: '/fan-profile',
    title: 'Fan Profile Maker · SKZ Arcade',
    description: 'Design and export your STAY profile card.',
  },
  {
    path: '/bias-quiz',
    title: 'Bias Quiz · SKZ Arcade',
    description: 'Which Stray Kids member matches your vibe?',
  },
  {
    path: '/memory-match',
    title: 'SKZOO Match · SKZ Arcade',
    description: 'Memory minigame — match random SKZOO pairs.',
  },
  {
    path: '/tier-list',
    title: 'SKZ Tier List Lab · SKZ Arcade',
    description: 'Customizable tier list builder for SKZOO, gallery photos, and uploads.',
  },
  {
    path: '/higher-lower',
    title: 'Higher or Lower · SKZ Arcade',
    description: 'Compare Stray Kids stats to stack a streak — ages, heights, and album years.',
  },
  {
    path: '/audio-guess',
    title: 'Audio Guess · SKZ Arcade',
    description:
      'Name the Stray Kids song from a short clip. Wrong guesses unlock more audio.',
  },
  {
    path: '/terms',
    title: 'Terms of Use · SKZ Arcade',
    description: 'Terms of use for SKZ Arcade.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy · SKZ Arcade',
    description: 'Privacy policy for SKZ Arcade.',
  },
  {
    path: '/contact',
    title: 'Contact · SKZ Arcade',
    description: 'Contact SKZ Arcade for corrections, takedowns, and privacy requests.',
  },
]

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function applyRouteMeta(html, route) {
  const url = `${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}`
  const title = escapeHtml(route.title)
  const description = escapeHtml(route.description)
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

  if (!out.includes('og:image:secure_url')) {
    out = out.replace(
      /<meta property="og:image" content="[^"]*"\s*\/>/,
      (m) =>
        `${m}\n    <meta property="og:image:secure_url" content="${image}" />`
    )
  }

  return out
}

if (!fs.existsSync(indexPath)) {
  console.error('Run vite build first — dist/index.html not found')
  process.exit(1)
}

const baseHtml = fs.readFileSync(indexPath, 'utf8')

for (const route of ROUTES) {
  const html = applyRouteMeta(baseHtml, route)
  const outPath =
    route.path === '/'
      ? indexPath
      : path.join(distDir, route.path.slice(1), 'index.html')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, html)
  console.log(`  ${route.path} → ${path.relative(distDir, outPath)}`)
}

console.log(`Prerendered ${ROUTES.length} routes for Open Graph crawlers.`)
