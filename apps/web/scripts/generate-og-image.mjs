/**
 * Generates public/og/skz-arcade.png (1200×630) for Open Graph / Twitter cards.
 * Run: node scripts/generate-og-image.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'public', 'og')
const outFile = path.join(outDir, 'skz-arcade.png')

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4c1d95"/>
      <stop offset="42%" stop-color="#1a1a1b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0"/>
      <stop offset="50%" stop-color="#a855f7" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="80" y="280" width="1040" height="2" fill="url(#glow)"/>
  <text x="96" y="200" fill="#ffffff" font-family="Inter, system-ui, sans-serif" font-size="72" font-weight="700" letter-spacing="-2">SKZ Arcade</text>
  <text x="96" y="268" fill="#a1a1aa" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="500">Daily Stray Kids puzzles for STAYs</text>
  <text x="96" y="360" fill="#e4e4e7" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="600">Song · Member · Lyric · Fan Profile</text>
  <rect x="96" y="400" width="52" height="52" rx="10" fill="#22c55e"/>
  <rect x="158" y="400" width="52" height="52" rx="10" fill="#ef4444"/>
  <rect x="220" y="400" width="52" height="52" rx="10" fill="#27272a" stroke="#52525b" stroke-width="2"/>
  <rect x="282" y="400" width="52" height="52" rx="10" fill="#27272a" stroke="#52525b" stroke-width="2"/>
  <rect x="344" y="400" width="52" height="52" rx="10" fill="#27272a" stroke="#52525b" stroke-width="2"/>
  <text x="96" y="520" fill="#71717a" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="600" letter-spacing="4">SKZARCADE.COM</text>
</svg>
`

fs.mkdirSync(outDir, { recursive: true })

await sharp(Buffer.from(svg)).png({ quality: 95 }).toFile(outFile)

console.log(`Wrote ${outFile}`)
