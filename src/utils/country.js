const STORAGE_KEY = 'skz_country_code'

/** ISO 3166-1 alpha-2 from BCP 47 locale (e.g. en-US → US). */
function countryFromLocale() {
  try {
    const locale =
      navigator.language ||
      (navigator.languages && navigator.languages[0]) ||
      'en'
    const part = locale.split('-')[1]
    if (part && part.length === 2) return part.toUpperCase()
  } catch {
    /* ignore */
  }
  return null
}

/** Rough fallback from IANA timezone (not perfect, better than nothing). */
function countryFromTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    const map = {
      'Asia/Seoul': 'KR',
      'Australia/Sydney': 'AU',
      'Australia/Melbourne': 'AU',
      'Europe/London': 'GB',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'America/New_York': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Los_Angeles': 'US',
      'America/Toronto': 'CA',
      'America/Sao_Paulo': 'BR',
      'Asia/Tokyo': 'JP',
      'Asia/Singapore': 'SG',
      'Asia/Manila': 'PH',
      'Asia/Jakarta': 'ID',
      'Asia/Kuala_Lumpur': 'MY',
    }
    if (map[tz]) return map[tz]
  } catch {
    /* ignore */
  }
  return null
}

export function getVisitorCountryCode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && /^[A-Z]{2}$/.test(stored)) return stored
  } catch {
    /* ignore */
  }

  const code = countryFromLocale() || countryFromTimezone() || 'XX'

  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    /* ignore */
  }

  return code
}

export function countryCodeToFlag(code) {
  if (!code || code.length !== 2 || code === 'XX') return '🌐'
  const upper = code.toUpperCase()
  return String.fromCodePoint(
    ...[...upper].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
  )
}

let displayNames
export function getCountryName(code) {
  if (!code || code === 'XX') return 'Global'
  try {
    displayNames ??= new Intl.DisplayNames(['en'], { type: 'region' })
    return displayNames.of(code) || code
  } catch {
    return code
  }
}
