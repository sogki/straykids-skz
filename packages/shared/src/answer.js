/**
 * Pure answer-checking helpers — safe to import from anywhere (web, bot,
 * scripts). No DOM, no localStorage, no Node-only APIs.
 *
 * The web app currently has its own copy in `apps/web/src/utils/checkAnswer.js`.
 * When deduplicating, prefer importing from `@skz/shared`.
 */

/** Strip punctuation/whitespace and lowercase so equivalent strings compare equal. */
export function normalizeAnswer(str) {
  if (typeof str !== 'string') return ''
  return str
    .trim()
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * @param {string} input - the user's guess
 * @param {{ answers: string[] }} puzzle - puzzle with an `answers` array of accepted variants
 */
export function isAnswerCorrect(input, puzzle) {
  if (!puzzle?.answers?.length) return false
  const normalised = normalizeAnswer(input)
  return puzzle.answers.some((a) => normalizeAnswer(a) === normalised)
}
