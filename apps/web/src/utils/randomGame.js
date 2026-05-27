/** Pick a random entry from the live games list (falls back to null if empty). */
export function pickRandomGame(games = []) {
  const playable = games.filter((g) => g?.path)
  if (!playable.length) return null
  return playable[Math.floor(Math.random() * playable.length)]
}
