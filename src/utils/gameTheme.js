/** Grainient overrides tinted per game accent colour. */
export function gameGrainientPreset(colorHex = '#ffffff') {
  return {
    color1: colorHex,
    color2: '#818384',
    color3: '#121213',
    warpStrength: 0.48,
    warpFrequency: 2.8,
    grainAmount: 0.06,
    contrast: 1.12,
    saturation: 0.5,
    zoom: 1.15,
    timeSpeed: 0.1,
  }
}

export const CATEGORY_IDS = ['all', 'daily', 'minigame', 'quiz', 'creative']

export const CATEGORY_LABELS = {
  all: 'All games',
  daily: 'Daily',
  minigame: 'Minigames',
  quiz: 'Quiz',
  creative: 'Creative',
}

export function gameCategoryId(game) {
  const tag = (game.tag || '').toLowerCase()
  if (tag.includes('daily')) return 'daily'
  if (tag.includes('minigame')) return 'minigame'
  if (tag.includes('quiz')) return 'quiz'
  if (tag.includes('creative')) return 'creative'
  return tag || 'other'
}

export const CATEGORY_ACCENT = {
  daily: '#a855f7',
  minigame: '#22c55e',
  quiz: '#38bdf8',
  creative: '#ef4444',
  all: '#ffffff',
}
