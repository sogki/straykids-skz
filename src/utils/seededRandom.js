/** Deterministic hash for daily seeds. */
export function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0
  }
  return h
}

/** Fisher–Yates shuffle with a reproducible seed string. */
export function seededShuffle(array, seed) {
  const arr = [...array]
  let state = hashString(String(seed))
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0
    const j = state % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
