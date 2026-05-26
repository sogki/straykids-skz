/**
 * Album-matched gradient presets — colours sampled from official album artwork
 * (see scripts/generate-album-gradient-presets.mjs + skzGradientPresets.generated.json).
 */
import albumSamples from './skzGradientPresets.generated.json'

/** Fallback samples when iTunes rate-limits the generator (same artwork sources). */
const ALBUM_SAMPLE_FALLBACK = {
  maxident: { primary: '#df90bd', accent: '#8a5f75' },
  oddinary: { primary: '#41884d', accent: '#182a27' },
  'christmas-evel': { primary: '#bd050f', accent: '#411813' },
  noeasy: { primary: '#857ff9', accent: '#1e13f4' },
  'all-in': { primary: '#e60012', accent: '#f5f5f5' },
  'go-live': { primary: '#ff8f00', accent: '#ffca28' },
  miroh: { primary: '#ffea00', accent: '#141414' },
  'i-am-who': { primary: '#5c6bc0', accent: '#cfd8dc' },
  'i-am-not': { primary: '#d4d7e6', accent: '#403f62' },
  mixtape: { primary: '#616161', accent: '#eeeeee' },
  blurple: { primary: '#5865f2', accent: '#7289da' },
}

const PRESET_DEFINITIONS = [
  { id: 'stay', name: '별, 빛 (STAY)', angle: 148 },
  { id: 'endless-sun', name: 'Endless Sun', angle: 132 },
  { id: 'do-it', name: 'DO IT', angle: 138 },
  { id: 'karma', name: 'KARMA', angle: 145 },
  { id: 'ceremony', name: 'CEREMONY', angle: 142 },
  { id: 'hollow', name: 'Hollow', angle: 155 },
  { id: 'dominate', name: 'Mixtape : dominATE', angle: 130 },
  { id: 'hop', name: '合 (HOP)', angle: 145 },
  { id: 'giant', name: 'GIANT', angle: 135 },
  { id: 'night', name: 'NIGHT', angle: 150 },
  { id: 'slash', name: 'SLASH', angle: 142 },
  { id: 'ate', name: 'ATE', angle: 140 },
  { id: 'five-star', name: '★★★★★ (5-STAR)', angle: 135 },
  { id: 'rockstar', name: '樂-STAR', angle: 150 },
  { id: 'maxident', name: 'MAXIDENT', angle: 155 },
  { id: 'time-out', name: 'Mixtape : Time Out', angle: 128 },
  { id: 'oddinary', name: 'ODDINARY', angle: 135 },
  { id: 'christmas-evel', name: 'Christmas EveL', angle: 145 },
  { id: 'noeasy', name: 'NOEASY', angle: 125 },
  { id: 'mixtape-oh', name: 'Mixtape : 애', angle: 138 },
  { id: 'all-in', name: 'ALL IN', angle: 140 },
  { id: 'in-life', name: 'IN生', angle: 145 },
  { id: 'go-live', name: 'GO生', angle: 130 },
  { id: 'levanter', name: 'Clé : LEVANTER', angle: 150 },
  { id: 'miroh', name: 'Clé 1 : MIROH', angle: 135 },
  { id: 'yellow-wood', name: 'Clé 2 : Yellow Wood', angle: 140 },
  { id: 'i-am-you', name: 'I am YOU', angle: 145 },
  { id: 'i-am-who', name: 'I am WHO', angle: 142 },
  { id: 'i-am-not', name: 'I am NOT', angle: 138 },
  { id: 'the-sound', name: 'THE SOUND', angle: 135 },
  { id: 'mixtape', name: 'Mixtape', angle: 135 },
  { id: 'blurple', name: 'SKZ Arcade', angle: 135 },
]

function resolveAlbumSample(id) {
  return albumSamples[id] ?? ALBUM_SAMPLE_FALLBACK[id] ?? null
}

function buildPreset(def) {
  const sample = resolveAlbumSample(def.id)
  return {
    ...def,
    primary: sample?.primary ?? '#5865f2',
    accent: sample?.accent ?? '#7289da',
    coverUrl: sample?.coverUrl ?? null,
  }
}

export const SKZ_GRADIENT_PRESETS = PRESET_DEFINITIONS.map(buildPreset)

/** Map profile “Era” dropdown labels → preset id */
export const ERA_GRADIENT_PRESET_MAP = {
  '별, 빛 (STAY)': 'stay',
  'Endless Sun': 'endless-sun',
  'DO IT': 'do-it',
  KARMA: 'karma',
  CEREMONY: 'ceremony',
  Hollow: 'hollow',
  'Mixtape : dominATE': 'dominate',
  '合 (HOP)': 'hop',
  GIANT: 'giant',
  NIGHT: 'night',
  SLASH: 'slash',
  ATE: 'ate',
  '★★★★★ (5-STAR)': 'five-star',
  '樂-STAR': 'rockstar',
  MAXIDENT: 'maxident',
  'Mixtape : Time Out': 'time-out',
  ODDINARY: 'oddinary',
  'Christmas EveL': 'christmas-evel',
  NOEASY: 'noeasy',
  'Mixtape : 애': 'mixtape-oh',
  'ALL IN': 'all-in',
  'THE SOUND': 'the-sound',
  'IN生': 'in-life',
  'GO生': 'go-live',
  'Clé : LEVANTER': 'levanter',
  'Clé 1 : MIROH': 'miroh',
  'Clé 2 : Yellow Wood': 'yellow-wood',
  'I am YOU': 'i-am-you',
  'I am WHO': 'i-am-who',
  'I am NOT': 'i-am-not',
  Mixtape: 'mixtape',
}

export const GRADIENT_PRESET_ID_ALIASES = {
  'stay-night': 'stay',
}

export function findSkzGradientPreset(id) {
  if (!id) return null
  const resolved = GRADIENT_PRESET_ID_ALIASES[id] ?? id
  return SKZ_GRADIENT_PRESETS.find((p) => p.id === resolved) ?? null
}

export function getGradientPresetForEra(eraLabel) {
  if (!eraLabel) return null
  const presetId = ERA_GRADIENT_PRESET_MAP[eraLabel.trim()]
  return presetId ? findSkzGradientPreset(presetId) : null
}
