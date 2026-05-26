/**
 * Higher or Lower — verified item pool.
 *
 * EVERY value in this file is from a public, stable source. We deliberately
 * skip stats that change daily (streams, MV views) or that are self-reported
 * (heights). If anything here is wrong, edit it — no part of the game makes
 * up numbers.
 *
 * Sources:
 *   - Member DOBs + heights: kprofiles.com/stray-kids-members-profile
 *     (cross-checked against official JYP Entertainment profiles).
 *     DOBs don't change; heights are the publicly listed JYP figures.
 *   - Album release years: Korean release year as reported by JYP press releases,
 *     iTunes Korea metadata, and Wikipedia "Stray Kids discography".
 *   - SKZOO avatars: Supabase storage (already used by the Memory Match game and
 *     the Fan Profile builder).
 *   - Album covers: pulled from skzGradientPresets (iTunes artwork).
 */

import { SKZOO_CHARACTERS, normalizeProfileAssetPath } from '@/data/profileAssets'
import { SKZ_GRADIENT_PRESETS } from '@/data/skzGradientPresets'

const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000

/** Compute an integer age from an ISO date string (UTC-safe). */
export function computeAge(isoDate, now = new Date()) {
  const dob = new Date(isoDate + 'T00:00:00Z')
  if (Number.isNaN(dob.getTime())) return null
  return Math.floor((now.getTime() - dob.getTime()) / MS_PER_YEAR)
}

/**
 * Member DOBs + officially-listed heights — current 8-piece Stray Kids lineup.
 * Source: kprofiles.com/stray-kids-members-profile (cross-checked May 2026).
 * Heights are the publicly-listed JYP figures. Do not edit without re-verifying.
 */
const MEMBER_BIRTHDAYS = [
  { id: 'bangchan', name: 'Bang Chan', dob: '1997-10-03', heightCm: 171 },
  { id: 'leeknow', name: 'Lee Know', dob: '1998-10-25', heightCm: 172 },
  { id: 'changbin', name: 'Changbin', dob: '1999-08-11', heightCm: 167 },
  { id: 'hyunjin', name: 'Hyunjin', dob: '2000-03-20', heightCm: 179 },
  { id: 'han', name: 'Han', dob: '2000-09-14', heightCm: 169 },
  { id: 'felix', name: 'Felix', dob: '2000-09-15', heightCm: 171 },
  { id: 'seungmin', name: 'Seungmin', dob: '2000-09-22', heightCm: 178 },
  { id: 'in', name: 'I.N', dob: '2001-02-08', heightCm: 172 },
]

function memberImage(id) {
  const c = SKZOO_CHARACTERS.find((x) => x.id === id)
  return c ? normalizeProfileAssetPath(c.image) : null
}

/**
 * Korean album/EP release **years** for Stray Kids. We only compare by year
 * (not exact date) so that being off by a single day in any source never
 * affects the puzzle. Years are universally agreed across sources.
 */
const ALBUM_YEARS = {
  'i-am-not': 2018, //  1st mini-album · Mar 26, 2018
  'i-am-who': 2018, //  2nd mini-album · Aug 6, 2018
  'i-am-you': 2018, //  3rd mini-album · Oct 22, 2018
  miroh: 2019, //       Clé 1 : MIROH · Mar 25, 2019
  'yellow-wood': 2019, //  Clé 2 : Yellow Wood · Jun 19, 2019
  levanter: 2019, //    Clé : LEVANTER · Dec 9, 2019
  'go-live': 2020, //   GO生 · Jun 17, 2020
  'in-life': 2020, //   IN生 (repackage) · Sep 14, 2020
  'all-in': 2020, //    ALL IN (Japan) · Nov 4, 2020
  'mixtape-oh': 2020, // Mixtape : 애 · Dec 26, 2020
  noeasy: 2021, //      NOEASY · Aug 23, 2021
  'christmas-evel': 2021, // Christmas EveL · Nov 29, 2021
  oddinary: 2022, //    ODDINARY · Mar 18, 2022
  maxident: 2022, //    MAXIDENT · Oct 7, 2022
  'time-out': 2022, //  Mixtape : Time Out · Dec 7, 2022
  'five-star': 2023, // ★★★★★ (5-STAR) · Jun 2, 2023
  rockstar: 2023, //    樂-STAR · Nov 10, 2023
  ate: 2024, //         ATE · Jul 19, 2024
  hop: 2024, //         合 (HOP) Japan · Dec 11, 2024
  giant: 2024, //       GIANT Japan · May 22, 2024
  dominate: 2025, //    Mixtape : dominATE · Mar 21, 2025
  hollow: 2025, //      Hollow · Aug 22, 2025
}

function albumPreset(id) {
  return SKZ_GRADIENT_PRESETS.find((p) => p.id === id) ?? null
}

function buildAlbumItems() {
  return Object.entries(ALBUM_YEARS)
    .map(([id, year]) => {
      const preset = albumPreset(id)
      if (!preset || !preset.coverUrl) return null
      return {
        id: `album_${id}`,
        label: preset.name,
        image: preset.coverUrl,
        value: year,
      }
    })
    .filter(Boolean)
}

function buildMemberItems() {
  return MEMBER_BIRTHDAYS.map((m) => {
    const age = computeAge(m.dob)
    return {
      id: `member_${m.id}`,
      label: m.name,
      image: memberImage(m.id),
      value: age,
      meta: `Born ${m.dob}`,
    }
  })
}

function buildMemberHeightItems() {
  return MEMBER_BIRTHDAYS.map((m) => ({
    id: `height_${m.id}`,
    label: m.name,
    image: memberImage(m.id),
    value: m.heightCm,
    meta: 'Officially listed',
  }))
}

/**
 * Each category can optionally override `formatValue(value)` to control how
 * the number is displayed. By default values render as raw strings (so a year
 * like 2024 stays "2024", not "2,024"). Add a `formatValue: (n) => …` to a
 * future category if it needs thousands separators (e.g. stream counts).
 */
export const HIGHER_LOWER_CATEGORIES = {
  'members-age': {
    id: 'members-age',
    label: 'Members by age',
    description: 'Who is older?',
    unit: 'years old',
    accent: '#f472b6',
    items: buildMemberItems,
    minItems: 2,
  },
  'members-height': {
    id: 'members-height',
    label: 'Members by height',
    description: 'Who is taller?',
    unit: 'cm',
    accent: '#38bdf8',
    items: buildMemberHeightItems,
    minItems: 2,
  },
  'albums-year': {
    id: 'albums-year',
    label: 'Albums by release year',
    description: 'Which dropped first?',
    unit: '',
    accent: '#a855f7',
    items: buildAlbumItems,
    minItems: 2,
  },
}

export function getCategory(id) {
  return HIGHER_LOWER_CATEGORIES[id] ?? null
}

export function getCategoryItems(id) {
  const c = getCategory(id)
  if (!c) return []
  return c.items()
}

export const HIGHER_LOWER_CATEGORY_LIST = Object.values(HIGHER_LOWER_CATEGORIES)
