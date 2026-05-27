/** Games that appear on the public country leaderboard selector. */
export const LEADERBOARD_GAMES = [
  {
    slug: 'guess-song',
    label: 'Daily Song Guess',
    winLabel: 'wins',
    description: 'Daily song puzzle solved in 5 tries or fewer.',
  },
  {
    slug: 'guess-member',
    label: 'Daily Member Guess',
    winLabel: 'wins',
    description: 'Member identified from emoji and SKZOO clues.',
  },
  {
    slug: 'guess-lyric',
    label: 'Daily Lyric Guess',
    winLabel: 'wins',
    description: 'Missing lyric word guessed correctly.',
  },
  {
    slug: 'bias-quiz',
    label: 'Bias Quiz',
    winLabel: 'completions',
    description: 'Finished the full bias quiz.',
  },
  {
    slug: 'fan-profile',
    label: 'Fan Profile Maker',
    winLabel: 'completions',
    description: 'Saved or exported a profile card.',
  },
  {
    slug: 'memory-match',
    label: 'SKZOO Match',
    winLabel: 'clears',
    description: 'Cleared a random SKZOO memory board.',
  },
  {
    slug: 'tier-list',
    label: 'SKZ Tier List Lab',
    winLabel: 'completions',
    description: 'Created and organized a custom SKZ tier list.',
  },
]

export function getLeaderboardGame(slug) {
  return LEADERBOARD_GAMES.find((g) => g.slug === slug) ?? LEADERBOARD_GAMES[0]
}
