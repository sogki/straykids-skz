/**
 * Writes public/version.json for client-side “new version” detection.
 * Run before `vite build`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const out = path.join(root, 'public', 'version.json')

const builtAt = new Date().toISOString()
const version =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.GITHUB_SHA?.slice(0, 12) ||
  `${Date.now().toString(36)}-${builtAt.slice(0, 10)}`

fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(
  out,
  JSON.stringify({ version, builtAt }, null, 2) + '\n',
  'utf8'
)
console.log(`Wrote version.json → ${version}`)
