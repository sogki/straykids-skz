/** Normalize user input for case-insensitive song matching */
export function normalizeAnswer(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s+/g, ' ')
}

export function isCorrectAnswer(userInput, acceptedAnswers) {
  const normalized = normalizeAnswer(userInput)
  if (!normalized) return false
  return acceptedAnswers.some(
    (answer) => normalizeAnswer(answer) === normalized
  )
}
