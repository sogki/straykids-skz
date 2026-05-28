import { useEffect, useRef } from 'react'
import { isAnswerCorrect } from '@/utils/dailyPuzzle'
import { recordPlayerDailyPoints } from '@/services/skzPlayerLeaderboard'

const DAILY_GAME_SLUGS = {
  song: 'guess-song',
  member: 'guess-member',
  lyric: 'guess-lyric',
}

/**
 * When a daily puzzle is won, send correct-guess count to the global player leaderboard.
 */
export function usePlayerDailyScoring({ storageGame, puzzle, state, todayKey }) {
  const scoredRef = useRef(false)

  useEffect(() => {
    scoredRef.current = false
  }, [todayKey, puzzle?.id, storageGame])

  useEffect(() => {
    if (!puzzle || !state || state.status !== 'won' || scoredRef.current) return

    const gameSlug = DAILY_GAME_SLUGS[storageGame]
    if (!gameSlug) return

    const correctGuesses = (state.guesses || []).filter((g) =>
      isAnswerCorrect(g, puzzle),
    ).length

    if (correctGuesses < 1) return

    scoredRef.current = true
    recordPlayerDailyPoints(gameSlug, todayKey, correctGuesses)
  }, [storageGame, puzzle, state, todayKey])
}
