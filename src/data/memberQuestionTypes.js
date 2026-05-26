/** Labels shown in the member daily UI for each question style. */
export const MEMBER_QUESTION_TYPES = {
  vibe: { label: 'Member vibe', emoji: '🎭' },
  quote: { label: 'Who said it?', emoji: '💬' },
  song_role: { label: 'Song role', emoji: '🎤' },
  unit: { label: 'Unit', emoji: '🔥' },
  era: { label: 'Comeback era', emoji: '💿' },
  trivia: { label: 'STAY trivia', emoji: '✨' },
}

export function getMemberQuestionMeta(type) {
  return MEMBER_QUESTION_TYPES[type] ?? MEMBER_QUESTION_TYPES.trivia
}
