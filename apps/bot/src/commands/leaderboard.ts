import { SlashCommandBuilder } from 'discord.js'
import { getSupabase } from '../db/supabase.js'
import {
  buildLeaderboardEmbed,
  PLAYER_DAILY_GAMES,
  type PlayerDailyGameSlug,
} from '../utils/playerDiscord.js'
import type { SlashCommand } from './index.js'

const GAME_CHOICES = [
  { name: 'All daily games', value: 'all' },
  { name: 'Daily Song Guess', value: 'guess-song' },
  { name: 'Daily Member Guess', value: 'guess-member' },
  { name: 'Daily Lyric Guess', value: 'guess-lyric' },
] as const

export const leaderboardCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top SKZ Arcade players by daily puzzle points.')
    .addStringOption((opt) =>
      opt
        .setName('game')
        .setDescription('Which daily game to rank (default: all)')
        .addChoices(...GAME_CHOICES),
    )
    .addIntegerOption((opt) =>
      opt
        .setName('days')
        .setDescription('Limit to the last N days (default: all time)')
        .setMinValue(1)
        .setMaxValue(90),
    ),
  async execute(interaction) {
    await interaction.deferReply()

    const days = interaction.options.getInteger('days')
    const gameRaw = interaction.options.getString('game')
    const gameSlug =
      gameRaw && gameRaw !== 'all' ? (gameRaw as PlayerDailyGameSlug) : null

    const db = getSupabase()
    const { data, error } = await db.rpc('skz_get_global_player_leaderboard', {
      p_days: days,
      p_limit: 10,
      p_game_slug: gameSlug,
    })

    if (error) {
      await interaction.editReply(`Could not load leaderboard: ${error.message}`)
      return
    }

    const entries = (data?.entries as Array<Record<string, unknown>> | undefined) ?? []
    const period =
      days != null ? `Last **${days}** days` : '**All time**'
    const gameTitle =
      gameSlug && PLAYER_DAILY_GAMES[gameSlug]
        ? `${PLAYER_DAILY_GAMES[gameSlug].emoji} ${PLAYER_DAILY_GAMES[gameSlug].label}`
        : null

    if (!entries.length) {
      const scope = gameTitle ? `${period} · ${gameTitle}` : period
      await interaction.editReply(
        `No player scores yet (${scope}).\n\nSign in on [skzarcade.com](https://skzarcade.com/profile) and solve daily puzzles to appear here.`,
      )
      return
    }

    const embed = buildLeaderboardEmbed({ entries, period, gameLabel: gameTitle })
    await interaction.editReply({ embeds: [embed] })
  },
}
