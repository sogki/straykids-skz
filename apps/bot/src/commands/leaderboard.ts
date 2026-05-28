import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { getSupabase } from '../db/supabase.js'
import type { SlashCommand } from './index.js'

function avatarUrl(userId: string, hash: string | null | undefined) {
  if (hash) {
    return `https://cdn.discordapp.com/avatars/${userId}/${hash}.png?size=64`
  }
  const index = Number(BigInt(userId) % 6n)
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`
}

export const leaderboardCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top SKZ Arcade players by daily puzzle points (global).')
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
    const db = getSupabase()
    const { data, error } = await db.rpc('skz_get_global_player_leaderboard', {
      p_days: days,
      p_limit: 10,
    })

    if (error) {
      await interaction.editReply(`Could not load leaderboard: ${error.message}`)
      return
    }

    const entries = (data?.entries as Array<Record<string, unknown>> | undefined) ?? []
    const period =
      days != null ? `Last **${days}** days` : '**All time**'

    if (!entries.length) {
      await interaction.editReply(
        `No player scores yet (${period}). Use **Continue with Discord** on skzarcade.com to join, then solve daily puzzles.`,
      )
      return
    }

    const lines = entries.map((e) => {
      const rank = e.rank ?? '?'
      const name = e.display_name ?? 'Player'
      const pts = e.total_points ?? 0
      return `**${rank}.** ${name} — ${pts} pt${pts === 1 ? '' : 's'}`
    })

    const embed = new EmbedBuilder()
      .setColor(0xa855f7)
      .setTitle('SKZ Arcade — global leaderboard')
      .setDescription(`${period}\n\n${lines.join('\n')}`)
      .setFooter({ text: '1 point per correct daily guess · link on skzarcade.com' })

    const top = entries[0]
    if (top?.discord_user_id) {
      embed.setThumbnail(
        avatarUrl(String(top.discord_user_id), top.avatar_hash as string | null),
      )
    }

    await interaction.editReply({ embeds: [embed] })
  },
}
