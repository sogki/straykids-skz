import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as dotenvConfig } from 'dotenv'

const srcDir = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(srcDir, '..')
const monorepoApps = path.resolve(apiRoot, '..')

/** Load local env from api, bot, and web — first file wins per key (api first). */
export function loadLocalEnv() {
  const files = [
    path.join(apiRoot, '.env'),
    path.join(monorepoApps, 'bot', '.env'),
    path.join(monorepoApps, 'web', '.env'),
  ]

  for (const file of files) {
    if (existsSync(file)) {
      dotenvConfig({ path: file, override: false })
    }
  }

  // Web only exposes VITE_* — map URL for bootstrap when bot/api .env omit SUPABASE_URL.
  if (!process.env.SUPABASE_URL?.trim() && process.env.VITE_SUPABASE_URL?.trim()) {
    process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL.trim()
  }

  if (
    !process.env.SKZ_BOOTSTRAP_SUPABASE_URL?.trim() &&
    process.env.SUPABASE_URL?.trim()
  ) {
    process.env.SKZ_BOOTSTRAP_SUPABASE_URL = process.env.SUPABASE_URL.trim()
  }

  if (
    !process.env.SKZ_BOOTSTRAP_SUPABASE_SERVICE_ROLE_KEY?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    process.env.SKZ_BOOTSTRAP_SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
  }
}
