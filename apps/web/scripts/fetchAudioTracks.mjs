/**
 * SKZ Audio Guess — iTunes preview + cover fetcher.
 *
 * Reads `src/data/skzAudioTracks.allowlist.md`, queries iTunes Search (US),
 * picks the best Stray Kids match per row, downloads the 30-second preview
 * MP3 + 600x600 cover art into `public/audio-game/`, and writes the consumed
 * metadata to `src/data/audioGameTracks.generated.json`.
 *
 * Rules for picking a match:
 *   - artistName (normalized) must contain "straykids"
 *   - prefer exact title match, then substring overlap
 *   - prefer album substring overlap
 *   - prefer entries that have a previewUrl
 *
 * Run with: `node scripts/fetchAudioTracks.mjs`
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const ALLOWLIST_PATH = path.join(ROOT, 'src', 'data', 'skzAudioTracks.allowlist.md')
const OUT_AUDIO_DIR = path.join(ROOT, 'public', 'audio-game')
const OUT_JSON_PATH = path.join(ROOT, 'src', 'data', 'audioGameTracks.generated.json')

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalize(str) {
  return (str || '')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/feat\.?.*$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function parseAllowlist(md) {
  const rows = []
  let inTable = false
  const lines = md.split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('| # |')) {
      inTable = true
      continue
    }
    if (!inTable) continue
    if (!line.startsWith('|')) {
      inTable = false
      continue
    }
    if (/^\|\s*-+/.test(line)) continue
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    if (cells.length < 7) continue
    const [num, title, album, yearStr, dailyId, altRaw, notes] = cells
    if (!title || !album) continue
    const yearNum = Number(yearStr)
    if (!Number.isFinite(yearNum)) continue
    rows.push({
      num: Number(num) || 0,
      title,
      album,
      year: yearNum,
      dailyId:
        !dailyId || dailyId === '—' || dailyId === '-'
          ? null
          : dailyId.replace(/^`|`$/g, ''),
      altAnswers:
        !altRaw || altRaw === '—' || altRaw === '-'
          ? []
          : altRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
      notes: notes && notes !== '—' ? notes : '',
    })
  }
  return rows
}


function titleMatchScore(rTitle, eTitle) {
  if (!rTitle || !eTitle) return 0
  if (rTitle === eTitle) return 200
  return 0
}

function scoreMatch(result, expectedTitle, expectedAlbum) {
  const artist = normalize(result.artistName)
  if (!artist.includes('straykids')) return -1
  const rTitle = normalize(result.trackName)
  const rAlbum = normalize(result.collectionName)
  const eTitle = normalize(expectedTitle)
  const eAlbum = normalize(expectedAlbum)
  const titleScore = titleMatchScore(rTitle, eTitle)
  if (titleScore === 0) return -1
  let score = titleScore
  if (rAlbum && eAlbum) {
    if (rAlbum === eAlbum) score += 80
    else if (rAlbum.includes(eAlbum) || eAlbum.includes(rAlbum)) score += 40
  }
  if (result.previewUrl) score += 20
  if (result.trackExplicitness === 'notExplicit') score += 2
  return score
}

function pickBestMatch(results, expectedTitle, expectedAlbum) {
  let best = null
  let bestScore = -1
  for (const r of results) {
    const s = scoreMatch(r, expectedTitle, expectedAlbum)
    if (s > bestScore) {
      bestScore = s
      best = r
    }
  }
  if (!best || bestScore <= 0) return null
  return best
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithRetry(url, { maxAttempts = 5, baseDelayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'skz-arcade-build/1.0 (+contact@stray.local)' },
    })
    if (res.ok) return res
    if ((res.status === 403 || res.status === 429) && attempt < maxAttempts) {
      const backoff = baseDelayMs * 2 ** (attempt - 1)
      console.log(`  rate-limited (${res.status}), backing off ${backoff}ms (attempt ${attempt}/${maxAttempts})…`)
      await sleep(backoff)
      continue
    }
    throw new Error(`HTTP ${res.status}`)
  }
  throw new Error('exhausted retries')
}

async function searchITunesRetry(title) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    `Stray Kids ${title}`
  )}&entity=song&country=us&limit=25`
  const res = await fetchWithRetry(url)
  const data = await res.json()
  return Array.isArray(data.results) ? data.results : []
}

async function downloadFile(url, destPath) {
  const res = await fetchWithRetry(url)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath))
}

async function loadExistingJson() {
  try {
    const raw = await readFile(OUT_JSON_PATH, 'utf8')
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return new Map()
    return new Map(arr.map((t) => [t.id, t]))
  } catch {
    return new Map()
  }
}

async function main() {
  await mkdir(OUT_AUDIO_DIR, { recursive: true })
  const md = await readFile(ALLOWLIST_PATH, 'utf8')
  const rows = parseAllowlist(md)
  console.log(`Parsed ${rows.length} tracks from allowlist.`)

  const existing = await loadExistingJson()
  console.log(`Resume: ${existing.size} tracks already present.`)

  const tracks = []
  const failures = []

  for (const row of rows) {
    const id = slugify(row.title)
    const label = `[${String(row.num).padStart(2, '0')}] ${row.title}`

    const prior = existing.get(id)
    if (prior) {
      tracks.push(prior)
      console.log(`${label} → SKIP (already in JSON)`)
      continue
    }

    try {
      const results = await searchITunesRetry(row.title)
      const match = pickBestMatch(results, row.title, row.album)
      if (!match) {
        console.log(`${label} → NO MATCH`)
        failures.push({ ...row, reason: 'no iTunes match' })
        await sleep(220)
        continue
      }
      if (!match.previewUrl) {
        console.log(`${label} → NO PREVIEW (${match.trackName})`)
        failures.push({ ...row, reason: 'iTunes match has no preview URL' })
        await sleep(220)
        continue
      }

      const audioPath = path.join(OUT_AUDIO_DIR, `${id}.mp3`)
      await downloadFile(match.previewUrl, audioPath)
      await sleep(200)

      let coverPath = null
      const cover100 = match.artworkUrl100 || ''
      const cover600 = cover100.replace('100x100bb', '600x600bb')
      if (cover600) {
        try {
          coverPath = path.join(OUT_AUDIO_DIR, `${id}.jpg`)
          await downloadFile(cover600, coverPath)
          await sleep(200)
        } catch (err) {
          console.log(`  cover failed for ${id}: ${err.message}`)
          coverPath = null
        }
      }

      const answers = Array.from(
        new Set(
          [row.title.toLowerCase(), ...row.altAnswers.map((a) => a.toLowerCase())]
            .map((a) => a.trim())
            .filter(Boolean)
        )
      )

      const track = {
        id,
        title: row.title,
        album: row.album,
        year: row.year,
        answers,
        preview: `/audio-game/${id}.mp3`,
        cover: coverPath ? `/audio-game/${id}.jpg` : null,
        spotifySearch: `https://open.spotify.com/search/${encodeURIComponent(
          `Stray Kids ${row.title}`
        )}`,
        itunes: {
          trackId: match.trackId,
          collectionId: match.collectionId,
          artistName: match.artistName,
          trackName: match.trackName,
          collectionName: match.collectionName,
          releaseDate: match.releaseDate,
        },
      }
      tracks.push(track)
      existing.set(id, track)
      // Save incrementally so we can resume safely after a rate-limit
      await writeFile(
        OUT_JSON_PATH,
        JSON.stringify(Array.from(existing.values()), null, 2) + '\n'
      )
      console.log(
        `${label} → OK  (${match.trackName} · ${match.collectionName})`
      )
    } catch (err) {
      console.log(`${label} → ERROR ${err.message}`)
      failures.push({ ...row, reason: err.message })
    }
    await sleep(3000)
  }

  await writeFile(OUT_JSON_PATH, JSON.stringify(tracks, null, 2) + '\n')

  console.log(`\nWrote ${tracks.length} tracks to ${path.relative(ROOT, OUT_JSON_PATH)}`)
  if (failures.length) {
    console.log(`\nFailures (${failures.length}):`)
    for (const f of failures) {
      console.log(`  - ${f.title} (${f.album} · ${f.year}): ${f.reason}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
