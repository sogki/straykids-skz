import { SITE_NAME, SITE_OG_IMAGE, absoluteSiteUrl } from '@/data/site'

/**
 * Per-route SEO + Open Graph (used in-app and for build-time HTML prerender).
 */
export const ROUTE_SEO = [
  {
    path: '/',
    title: SITE_NAME,
    description:
      'Daily Stray Kids puzzles for STAYs — song, member, and lyric guesses, bias quiz, and fan profile maker. Play free at skzarcade.com.',
    keywords: 'Stray Kids, STAY, daily puzzle, song guess, SKZ Arcade',
  },
  {
    path: '/arcade',
    title: 'Browse Arcade',
    description:
      'Browse all SKZ Arcade minigames — daily puzzles, bias quiz, and fan profile maker for Stray Kids fans.',
  },
  {
    path: '/guess-song',
    title: 'Daily Song Guess',
    description:
      'Guess today’s Stray Kids track from emoji and lyric clues. Five tries, new puzzle every day at midnight UTC.',
  },
  {
    path: '/guess-member',
    title: 'Daily Member Guess',
    description:
      'Guess which Stray Kids member matches today’s vibe clues. Five tries, new member every day.',
  },
  {
    path: '/guess-lyric',
    title: 'Daily Lyric Guess',
    description:
      'Fill in the blank in today’s Stray Kids lyric. Five tries, new line every day.',
  },
  {
    path: '/fan-profile',
    title: 'Fan Profile Maker',
    description:
      'Design and export your STAY profile card with bias, era, colours, and SKZOO buddy decoration.',
  },
  {
    path: '/bias-quiz',
    title: 'Bias Quiz',
    description:
      'Which Stray Kids member matches your vibe? Take the bias quiz and share your result.',
  },
  {
    path: '/memory-match',
    title: 'SKZOO Match',
    description:
      'Match SKZOO buddy pairs in this memory minigame. Random layout every round — play as many times as you like.',
  },
  {
    path: '/tier-list',
    title: 'SKZ Tier List Lab',
    description:
      'Create custom Stray Kids tier lists with editable rows, labels, and image sets including SKZOO and gallery photos.',
  },
  {
    path: '/higher-lower',
    title: 'Higher or Lower',
    description:
      'Higher-or-lower with Stray Kids stats — compare member ages, heights, and album release years to stack a streak.',
  },
  {
    path: '/audio-guess',
    title: 'Audio Guess',
    description:
      'Name the Stray Kids song from a short clip. Wrong guesses unlock more audio. Daily and unlimited modes.',
  },
  {
    path: '/audio-guess/unlimited',
    title: 'Audio Guess — Unlimited',
    description:
      'Endless Stray Kids audio guessing — random clip every round, streak tracking, today’s daily track excluded.',
  },
  {
    path: '/terms',
    title: 'Terms of Use',
    description: 'Terms of use for SKZ Arcade — fan-made Stray Kids puzzles and minigames.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description: 'How SKZ Arcade collects and uses analytics, leaderboard, and contact data.',
  },
  {
    path: '/contact',
    title: 'Contact & Requests',
    description:
      'Contact SKZ Arcade for data corrections, takedowns, privacy questions, and feedback.',
  },
]

export function getRouteSeo(pathname) {
  const exact = ROUTE_SEO.find((r) => r.path === pathname)
  if (exact) return { ...exact, image: SITE_OG_IMAGE }

  return {
    path: pathname,
    title: 'Page not found',
    description: 'This page could not be found on SKZ Arcade.',
    image: SITE_OG_IMAGE,
    noindex: true,
  }
}

export function formatDocumentTitle(title) {
  if (!title || title === SITE_NAME) return SITE_NAME
  if (title.includes(SITE_NAME)) return title
  return `${title} · ${SITE_NAME}`
}

export function buildRouteJsonLd(meta) {
  const url = absoluteSiteUrl(meta.path)
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: formatDocumentTitle(meta.title),
    description: meta.description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: absoluteSiteUrl('/'),
    },
  }
}
