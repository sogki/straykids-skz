/**
 * Fan profile customization — SKZOO, banner presets, colours.
 * Stray Kids Photos: JYP gallery at straykids.jype.com/Default/Gallery (see strayKidsPhotos.js).
 * SKZOO avatars: Supabase storage (skz_arcade bucket).
 */

import {
  STRAY_KIDS_PHOTOS,
  STRAY_KIDS_PHOTOS_PER_PAGE,
  STRAY_KIDS_PHOTO_COUNT,
} from '@/data/strayKidsPhotos'
import {
  SKZ_GRADIENT_PRESETS,
  findSkzGradientPreset,
} from '@/data/skzGradientPresets'

export { STRAY_KIDS_PHOTOS, STRAY_KIDS_PHOTOS_PER_PAGE, STRAY_KIDS_PHOTO_COUNT }

const SKZOO_BASE =
  'https://vwdrdqkzjkfdmycomfvf.supabase.co/storage/v1/object/public/skz_arcade'

export const PROFILE_LAYOUTS = {
  PORTRAIT: 'portrait',
  BANNER: 'banner',
}

export const PROFILE_LAYOUT_OPTIONS = [
  {
    id: PROFILE_LAYOUTS.PORTRAIT,
    name: 'Portrait',
    description: 'Taller card — best for feeds and phone wallpapers.',
  },
  {
    id: PROFILE_LAYOUTS.BANNER,
    name: 'Banner',
    description: 'Wider card — showcases your photo across the top.',
  },
]

/** Legacy local .svg paths → .png; remote URLs pass through unchanged. */
export function normalizeProfileAssetPath(path) {
  if (typeof path === 'string' && path.startsWith('http')) return path
  if (typeof path === 'string' && path.endsWith('.svg')) {
    return path.replace(/\.svg$/, '.png')
  }
  return path
}

export const SKZOO_CHARACTERS = [
  {
    id: 'bangchan',
    name: 'Wolf Chan',
    member: 'Bang Chan',
    color: '#7c3aed',
    image: `${SKZOO_BASE}/skzoo-character-avatars-bangchan-wolfchan.png`,
  },
  {
    id: 'leeknow',
    name: 'Leebit',
    member: 'Lee Know',
    color: '#94a3b8',
    image: `${SKZOO_BASE}/skzoo-character-avatars-leebit-leeknow.png`,
  },
  {
    id: 'changbin',
    name: 'Dwaekki',
    member: 'Changbin',
    color: '#ef4444',
    image: `${SKZOO_BASE}/skzoo-character-avatars-changbin-dwaekki.png`,
  },
  {
    id: 'hyunjin',
    name: 'Jiniret',
    member: 'Hyunjin',
    color: '#f472b6',
    image: `${SKZOO_BASE}/skzoo-character-avatars-jiniret-hyunjin.png`,
  },
  {
    id: 'han',
    name: 'Quokka',
    member: 'Han',
    color: '#f59e0b',
    image: `${SKZOO_BASE}/skzoo-character-avatars-quokka-han.png`,
  },
  {
    id: 'felix',
    name: 'Bbokari',
    member: 'Felix',
    color: '#fbbf24',
    image: `${SKZOO_BASE}/skzoo-character-avatars-bbokari-felix.png`,
  },
  {
    id: 'seungmin',
    name: 'PuppyM',
    member: 'Seungmin',
    color: '#38bdf8',
    image: `${SKZOO_BASE}/skzoo-character-avatars-puppym-seungmin.png`,
  },
  {
    id: 'in',
    name: 'FoxI.NY',
    member: 'I.N',
    color: '#fb923c',
    image: `${SKZOO_BASE}/skzoo-character-avatars-foxiny-in.png`,
  },
]

/** @see skzGradientPresets.js — album-matched gradient presets */
export const GRADIENT_PRESETS = SKZ_GRADIENT_PRESETS

/** @deprecated Use STRAY_KIDS_PHOTOS */
export const IMAGE_BACKGROUNDS = STRAY_KIDS_PHOTOS

const PHOTO_ID_ALIASES = {
  'karma-album': 'karma',
  'ate-album': 'ate',
  'do-it': '10-do-it-do',
  'stay-single': 'stay',
  'stay-night': 'stay',
  'endless-sun': 'endless-sun',
  'skz-logo': 'skz',
}

function resolvePhotoId(id) {
  if (!id) return null
  if (STRAY_KIDS_PHOTOS.some((p) => p.id === id)) return id

  const alias = PHOTO_ID_ALIASES[id]
  if (alias) {
    const exact = STRAY_KIDS_PHOTOS.find((p) => p.id === alias)
    if (exact) return exact.id
    const partial = STRAY_KIDS_PHOTOS.find((p) => p.id.includes(alias))
    if (partial) return partial.id
  }

  const stem = id.replace(/-album$/, '')
  const fuzzy = STRAY_KIDS_PHOTOS.find(
    (p) => p.id === stem || p.id.startsWith(`${stem}-`) || p.id.includes(stem)
  )
  return fuzzy?.id ?? id
}

export const COLOUR_SWATCHES = [
  { name: 'Blurple', value: '#5865F2' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Gold', value: '#fbbf24' },
  { name: 'Blue', value: '#38bdf8' },
  { name: 'Pink', value: '#f472b6' },
  { name: 'Mint', value: '#34d399' },
  { name: 'Slate', value: '#94a3b8' },
]

export const BANNER_MODES = {
  GRADIENT: 'gradient',
  IMAGE: 'image',
}

export function findSkzoo(id) {
  if (!id) return null
  const character = SKZOO_CHARACTERS.find((c) => c.id === id) ?? null
  if (!character) return null
  return {
    ...character,
    image: normalizeProfileAssetPath(character.image),
  }
}

export function findImageBackground(id) {
  if (!id) return null
  const resolvedId = resolvePhotoId(id)
  const photo = STRAY_KIDS_PHOTOS.find((b) => b.id === resolvedId) ?? null
  if (!photo) return null
  return {
    ...photo,
    image: normalizeProfileAssetPath(photo.image),
    jypeUrl: photo.jypeUrl,
  }
}

export function findGradientPreset(id) {
  return findSkzGradientPreset(id)
}
