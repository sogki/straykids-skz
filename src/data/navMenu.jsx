import { Gamepad2 } from 'lucide-react'
import { DISCORD_INVITE } from '@/data/site'

/** Static nav entries (Games submenu is built from live game list). */
export const NAV_HOME = {
  title: 'Home',
  url: '/',
}

export const NAV_GAMES_SECTION = {
  title: 'Games',
  url: '/arcade',
  items: [
    {
      title: 'Browse arcade',
      description: 'All minigames and daily puzzles in one place',
      icon: <Gamepad2 className="size-5 shrink-0" />,
      url: '/arcade',
    },
  ],
}

export function buildGamesMenuItems(games = []) {
  const gameItems = games.map((game) => ({
    title: game.title,
    description: game.description,
    icon: (
      <span className="flex size-5 shrink-0 items-center justify-center text-base leading-none">
        {game.emoji}
      </span>
    ),
    url: game.path,
  }))

  return {
    ...NAV_GAMES_SECTION,
    items: [...NAV_GAMES_SECTION.items, ...gameItems],
  }
}

export const NAV_DISCORD = {
  title: 'Discord',
  url: DISCORD_INVITE,
  external: true,
}

export const NAV_PLAY_RANDOM_LABEL = 'Play random game'
