import { SKZOO_CHARACTERS, normalizeProfileAssetPath } from '@/data/profileAssets'
import { SKZ_GRADIENT_PRESETS } from '@/data/skzGradientPresets'
import { STRAY_KIDS_PHOTOS } from '@/data/strayKidsPhotos'

export function buildSkzooItems() {
  return SKZOO_CHARACTERS.map((c) => ({
    id: `skzoo_${c.id}`,
    name: c.name,
    image: normalizeProfileAssetPath(c.image),
    source: 'skzoo',
  }))
}

export function buildAlbumItems() {
  return SKZ_GRADIENT_PRESETS.filter((p) => p.coverUrl).map((p) => ({
    id: `album_${p.id}`,
    name: p.name,
    image: p.coverUrl,
    source: 'album',
  }))
}

export function buildGalleryItems(limit = 32) {
  return STRAY_KIDS_PHOTOS.slice(0, limit).map((p) => ({
    id: `gallery_${p.id}`,
    name: p.name,
    image: p.image,
    source: 'gallery',
  }))
}

export function buildMixedItems() {
  return [...buildSkzooItems(), ...buildAlbumItems().slice(0, 12)]
}
