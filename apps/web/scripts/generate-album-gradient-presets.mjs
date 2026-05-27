/**
 * Samples dominant colours from iTunes album artwork for each SKZ era preset.
 * Run: node scripts/generate-album-gradient-presets.mjs
 * Writes: src/data/skzGradientPresets.generated.json
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../src/data/skzGradientPresets.generated.json')

/**
 * preset id → { term, match } — match is tested against collectionName (case-insensitive)
 */
const ALBUM_SEARCH = {
  stay: { term: 'Stray Kids STAY', match: /STAY|별.*빛/i },
  'endless-sun': { term: 'Stray Kids Endless Sun', match: /Endless Sun/i },
  'do-it': { term: 'Stray Kids DO IT', match: /DO IT/i },
  karma: { term: 'Stray Kids KARMA', match: /^KARMA$/i },
  ceremony: { term: 'Stray Kids CEREMONY', match: /CEREMONY/i },
  hollow: { term: 'Stray Kids Hollow', match: /Hollow/i },
  dominate: { term: 'Stray Kids dominATE', match: /dominATE/i },
  hop: { term: 'Stray Kids HOP', match: /HOP|合/i },
  giant: { term: 'Stray Kids GIANT', match: /GIANT/i },
  night: { term: 'Stray Kids NIGHT', match: /NIGHT/i },
  slash: { term: 'Stray Kids SLASH', match: /SLASH/i },
  ate: { term: 'Stray Kids ATE', match: /\bATE\b/i },
  'five-star': { term: 'Stray Kids 5-STAR', match: /5-STAR|★★★★★/i },
  rockstar: { term: 'Stray Kids ROCK-STAR', match: /ROCK-STAR|樂-STAR/i },
  maxident: { term: 'Stray Kids MAXIDENT', match: /MAXIDENT/i },
  'time-out': { term: 'Stray Kids Time Out', match: /Time Out/i },
  oddinary: { term: 'Stray Kids ODDINARY', match: /ODDINARY/i },
  'christmas-evel': { term: 'Stray Kids Christmas EveL', match: /Christmas EveL/i },
  noeasy: { term: 'Stray Kids NOEASY', match: /NOEASY/i },
  'mixtape-oh': { term: 'Stray Kids Mixtape OH', match: /Mixtape.*애|Mixtape.*OH/i },
  'all-in': { term: 'Stray Kids ALL IN', match: /ALL IN/i },
  'in-life': { term: 'Stray Kids IN LIFE', match: /IN LIFE|IN生/i },
  'go-live': { term: 'Stray Kids GO LIVE', match: /GO LIVE|GO生/i },
  levanter: { term: 'Stray Kids LEVANTER', match: /LEVANTER/i },
  miroh: { term: 'Stray Kids MIROH', match: /MIROH/i },
  'yellow-wood': { term: 'Stray Kids Yellow Wood', match: /Yellow Wood/i },
  'i-am-you': { term: 'Stray Kids I am YOU', match: /I am YOU/i },
  'i-am-who': { term: 'Stray Kids I am WHO', match: /I am WHO/i },
  'i-am-not': { term: 'Stray Kids I am NOT', match: /I am NOT/i },
  'the-sound': { term: 'Stray Kids THE SOUND', match: /THE SOUND/i },
  mixtape: { term: 'Stray Kids Mixtape', match: /^Mixtape$/i },
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  )
}

function colorDist(a, b) {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
}

function saturation({ r, g, b }) {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  if (max === 0) return 0
  const l = (max + min) / 2
  const d = max - min
  return l > 0.5 ? d / (2 - max - min) : d / (max + min)
}

function luminance({ r, g, b }) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

function extractTwoColors(pixels) {
  const filtered = pixels.filter((p) => {
    const lum = luminance(p)
    const sat = saturation(p)
    return lum > 0.05 && lum < 0.95 && sat > 0.06
  })
  const pool = filtered.length >= 24 ? filtered : pixels

  let c1 = pool[0]
  let c2 = pool[Math.floor(pool.length / 2)] ?? pool[0]

  for (let iter = 0; iter < 14; iter++) {
    const g1 = []
    const g2 = []
    for (const p of pool) {
      if (colorDist(p, c1) <= colorDist(p, c2)) g1.push(p)
      else g2.push(p)
    }
    if (g1.length) {
      c1 = {
        r: g1.reduce((s, p) => s + p.r, 0) / g1.length,
        g: g1.reduce((s, p) => s + p.g, 0) / g1.length,
        b: g1.reduce((s, p) => s + p.b, 0) / g1.length,
      }
    }
    if (g2.length) {
      c2 = {
        r: g2.reduce((s, p) => s + p.r, 0) / g2.length,
        g: g2.reduce((s, p) => s + p.g, 0) / g2.length,
        b: g2.reduce((s, p) => s + p.b, 0) / g2.length,
      }
    }
  }

  const sorted = [c1, c2].sort((a, b) => luminance(b) - luminance(a))
  return {
    primary: rgbToHex(sorted[0].r, sorted[0].g, sorted[0].b),
    accent: rgbToHex(sorted[1].r, sorted[1].g, sorted[1].b),
  }
}

async function fetchArtworkUrl(term, matchRe) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=12&country=US`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`)
  const json = await res.json()
  const skz = (json.results ?? []).filter((r) => /stray kids/i.test(r.artistName ?? ''))
  const match = skz.find((r) => matchRe.test(r.collectionName ?? ''))
  if (!match?.artworkUrl100) return null
  return {
    coverUrl: match.artworkUrl100.replace('100x100bb', '600x600bb'),
    collectionName: match.collectionName,
  }
}

async function sampleArtwork(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Artwork fetch failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const sharp = (await import('sharp')).default
  const { data, info } = await sharp(buf)
    .resize(80, 80, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = []
  for (let i = 0; i < data.length; i += info.channels) {
    pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] })
  }
  return extractTwoColors(pixels)
}

async function main() {
  const results = {}

  for (const [id, { term, match }] of Object.entries(ALBUM_SEARCH)) {
    process.stdout.write(`Sampling ${id}… `)
    try {
      const art = await fetchArtworkUrl(term, match)
      if (!art?.coverUrl) {
        console.log('no match')
        continue
      }
      const { primary, accent } = await sampleArtwork(art.coverUrl)
      results[id] = {
        primary,
        accent,
        coverUrl: art.coverUrl,
        sourceAlbum: art.collectionName,
      }
      console.log(primary, accent, `(${art.collectionName})`)
    } catch (err) {
      console.log(`error: ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, 300))
  }

  writeFileSync(OUT, JSON.stringify(results, null, 2) + '\n')
  console.log(`\nWrote ${OUT} (${Object.keys(results).length} presets)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
