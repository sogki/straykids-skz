import { EmbedBuilder } from 'discord.js'

export const PLAYER_DAILY_GAMES = {
  'guess-song': { label: 'Daily Song Guess', emoji: '🎵' },
  'guess-member': { label: 'Daily Member Guess', emoji: '🎭' },
  'guess-lyric': { label: 'Daily Lyric Guess', emoji: '📝' },
} as const

export type PlayerDailyGameSlug = keyof typeof PLAYER_DAILY_GAMES

import { discordAvatarUrl } from '@skz/shared'

export { discordAvatarUrl }

export function gameLabel(slug: string) {
  const meta = PLAYER_DAILY_GAMES[slug as PlayerDailyGameSlug]
  return meta ? `${meta.emoji} ${meta.label}` : slug
}

export function formatPuzzleDate(isoDate: string) {
  try {
    return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoDate
  }
}

export function formatLinkedAt(iso: string | null | undefined) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

type LeaderboardEntry = {
  rank?: number
  display_name?: string
  total_points?: number
  discord_user_id?: string
  avatar_hash?: string | null
}

export function buildLeaderboardEmbed(options: {
  entries: LeaderboardEntry[]
  period: string
  gameLabel?: string | null
  limit?: number
}) {
  const { entries, period, gameLabel: gameTitle, limit = 10 } = options
  const scope = gameTitle ? `${period} · ${gameTitle}` : period

  const lines = entries.slice(0, limit).map((e) => {
    const rank = e.rank ?? '?'
    const name = e.display_name ?? 'Player'
    const pts = e.total_points ?? 0
    return `**${rank}.** ${name} — ${pts} pt${pts === 1 ? '' : 's'}`
  })

  const embed = new EmbedBuilder()
    .setColor(0xa855f7)
    .setTitle('SKZ Arcade — player leaderboard')
    .setDescription(`${scope}\n\n${lines.join('\n')}`)
    .setFooter({
      text: '1 point per correct daily guess · /profile · skzarcade.com',
    })

  const top = entries[0]
  if (top?.discord_user_id) {
    embed.setThumbnail(
      discordAvatarUrl(String(top.discord_user_id), top.avatar_hash as string | null),
    )
  }

  return embed
}

type ProfileData = {
  hidden?: boolean
  discord_user_id?: string
  display_name?: string
  username?: string
  avatar_hash?: string | null
  linked_at?: string
  total_points?: number
  global_rank?: number | null
  daily_wins?: number
  points_by_game?: Array<{
    game_slug: string
    days_played: number
    total_points: number
  }>
  recent_scores?: Array<{
    game_slug: string
    puzzle_date: string
    points: number
  }>
}

export function buildProfileEmbed(profile: ProfileData, isSelf: boolean) {
  const userId = String(profile.discord_user_id ?? '')
  const name = profile.display_name ?? profile.username ?? 'Player'

  if (profile.hidden) {
    return new EmbedBuilder()
      .setColor(0x71717a)
      .setTitle(name)
      .setDescription(
        'This player keeps their stats off the public leaderboard.\nOnly they can view full details with `/profile`.',
      )
      .setThumbnail(discordAvatarUrl(userId, profile.avatar_hash))
  }

  const total = profile.total_points ?? 0
  const rank = profile.global_rank
  const wins = profile.daily_wins ?? 0
  const linked = formatLinkedAt(profile.linked_at)

  const byGame = profile.points_by_game ?? []
  const byGameText =
    byGame.length > 0
      ? byGame
          .map((g) => `**${gameLabel(g.game_slug)}** — ${g.total_points} pt (${g.days_played} day${g.days_played === 1 ? '' : 's'})`)
          .join('\n')
      : '_No daily scores yet._'

  const recent = profile.recent_scores ?? []
  const recentText =
    recent.length > 0
      ? recent
          .map(
            (r) =>
              `${gameLabel(r.game_slug)} · ${formatPuzzleDate(r.puzzle_date)} · +${r.points} pt`,
          )
          .join('\n')
      : null

  const embed = new EmbedBuilder()
    .setColor(0xf472b6)
    .setAuthor({ name, iconURL: discordAvatarUrl(userId, profile.avatar_hash) })
    .setThumbnail(discordAvatarUrl(userId, profile.avatar_hash, 256))
    .addFields(
      { name: 'Total points', value: String(total), inline: true },
      {
        name: 'Global rank',
        value: rank ? `#${rank}` : total > 0 ? '—' : 'Unranked',
        inline: true,
      },
      { name: 'Daily wins', value: String(wins), inline: true },
      { name: 'Points by game', value: byGameText, inline: false },
    )

  if (linked) {
    embed.setFooter({ text: `Linked ${linked} · skzarcade.com/profile` })
  } else {
    embed.setFooter({ text: 'skzarcade.com/profile' })
  }

  if (recentText) {
    embed.addFields({ name: 'Recent scores', value: recentText, inline: false })
  }

  if (isSelf && total === 0) {
    embed.setDescription(
      'Play daily Song, Member, or Lyric guesses on **skzarcade.com** while signed in with Discord to earn points.',
    )
  }

  return embed
}
