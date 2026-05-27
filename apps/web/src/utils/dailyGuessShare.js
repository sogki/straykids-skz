import { absoluteSiteUrl, SITE_NAME } from '@/data/site'

const GAME_SHARE = {
  song: {
    path: '/guess-song',
    title: 'Daily Song Guess',
    accent: '#a855f7',
    slug: 'song',
  },
  member: {
    path: '/guess-member',
    title: 'Daily Member Guess',
    accent: '#f472b6',
    slug: 'member',
  },
  lyric: {
    path: '/guess-lyric',
    title: 'Daily Lyric Guess',
    accent: '#38bdf8',
    slug: 'lyric',
  },
}

export function getShareGameConfig(kind = 'song') {
  return GAME_SHARE[kind] ?? GAME_SHARE.song
}

/**
 * Share metadata for daily guess games (image export + link copy).
 */
export function buildDailyGuessShare({ todayKey, state, maxGuesses, won, kind = 'song' }) {
  const game = getShareGameConfig(kind)
  const url = absoluteSiteUrl(game.path)
  const scoreLine = won
    ? `${state.guesses.length}/${maxGuesses}`
    : `X/${maxGuesses}`

  const shortText = won
    ? `${game.title} · ${scoreLine} today`
    : `${game.title} · ${scoreLine} today`

  const text = [
    `${SITE_NAME} · ${game.title}`,
    todayKey,
    scoreLine,
    '',
    url,
  ].join('\n')

  const title = `${SITE_NAME} — ${game.title}`

  return {
    url,
    text,
    title,
    shortText,
    scoreLine,
    gameTitle: game.title,
    accent: game.accent,
    kind,
    filename: `skz-arcade-${game.slug}-${todayKey}.png`,
  }
}

export async function copyDailyGuessLink(share) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(share.url)
    return true
  }
  return false
}
