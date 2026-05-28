import { SlashCommandBuilder } from 'discord.js'
import { getSupabase } from '../db/supabase.js'
import { buildProfileEmbed } from '../utils/playerDiscord.js'
import type { SlashCommand } from './index.js'

const SITE_LINK =
  'Sign in with Discord on [skzarcade.com/profile](https://skzarcade.com/profile) to track daily puzzle points.'

export const profileCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View an SKZ Arcade player profile — points, rank, and daily wins.')
    .addUserOption((opt) =>
      opt
        .setName('user')
        .setDescription('Player to look up (defaults to you)')
        .setRequired(false),
    ),
  async execute(interaction) {
    await interaction.deferReply()

    const target = interaction.options.getUser('user') ?? interaction.user
    const viewerId = interaction.user.id
    const isSelf = target.id === viewerId
    const db = getSupabase()

    await db.rpc('skz_player_touch_discord_profile', {
      p_discord_user_id: target.id,
      p_username: target.username,
      p_global_name: target.globalName ?? null,
      p_avatar_hash: target.avatar,
    })

    const { data: profile, error } = await db.rpc('skz_player_get_discord_profile', {
      p_discord_user_id: target.id,
      p_viewer_discord_user_id: viewerId,
    })

    if (error) {
      await interaction.editReply(`Could not load profile: ${error.message}`)
      return
    }

    if (!profile) {
      const msg = isSelf
        ? `No SKZ Arcade profile yet.\n\n${SITE_LINK}`
        : `${target.displayName ?? target.username} has not linked SKZ Arcade yet.`
      await interaction.editReply(msg)
      return
    }

    const embed = buildProfileEmbed(profile as Record<string, unknown>, isSelf)
    await interaction.editReply({ embeds: [embed] })
  },
}
