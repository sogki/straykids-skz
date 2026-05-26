/** SKZOO Match — board size & match rules */

export const MEMORY_MATCH_SET_COUNTS = [4, 6, 8, 10, 12]
export const MEMORY_MATCH_CARDS_PER_SET = [2, 3, 4]
export const MEMORY_MATCH_MEMORIZE_SECONDS = [4, 5, 6, 8, 10, 12, 15]

export const DEFAULT_MEMORY_MATCH_SETTINGS = {
  setCount: 6,
  cardsPerSet: 2,
  memorizeSeconds: 6,
}

const STORAGE_KEY = 'skz_memory_match_settings'

export function loadMemoryMatchSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_MEMORY_MATCH_SETTINGS }
    const parsed = JSON.parse(raw)
    return normalizeMemoryMatchSettings(parsed)
  } catch {
    return { ...DEFAULT_MEMORY_MATCH_SETTINGS }
  }
}

export function saveMemoryMatchSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeMemoryMatchSettings(settings)))
  } catch {
    /* ignore */
  }
}

export function normalizeMemoryMatchSettings(input) {
  const setCount = MEMORY_MATCH_SET_COUNTS.includes(input?.setCount)
    ? input.setCount
    : DEFAULT_MEMORY_MATCH_SETTINGS.setCount
  const cardsPerSet = MEMORY_MATCH_CARDS_PER_SET.includes(input?.cardsPerSet)
    ? input.cardsPerSet
    : DEFAULT_MEMORY_MATCH_SETTINGS.cardsPerSet
  const memorizeSeconds = MEMORY_MATCH_MEMORIZE_SECONDS.includes(input?.memorizeSeconds)
    ? input.memorizeSeconds
    : DEFAULT_MEMORY_MATCH_SETTINGS.memorizeSeconds
  return { setCount, cardsPerSet, memorizeSeconds }
}

export function getTotalCards(settings) {
  return settings.setCount * settings.cardsPerSet
}

/** Grid columns for the card board */
export function getBoardGridColumns(totalCards) {
  if (totalCards <= 8) return 4
  if (totalCards <= 12) return 4
  if (totalCards <= 16) return 4
  if (totalCards <= 20) return 5
  if (totalCards <= 24) return 6
  if (totalCards <= 30) return 6
  if (totalCards <= 36) return 6
  return 8
}

export function getMatchSizeLabel(cardsPerSet) {
  if (cardsPerSet === 2) return 'pairs'
  if (cardsPerSet === 3) return 'triples'
  return 'quads'
}

export function formatSetCountLabel(setCount, cardsPerSet) {
  const match = getMatchSizeLabel(cardsPerSet)
  return `${setCount} ${match}`
}
