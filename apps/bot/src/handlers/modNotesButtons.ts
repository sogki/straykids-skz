import {
  Events,
  GuildMember,
  MessageFlags,
  type ButtonInteraction,
  type Client,
} from 'discord.js'
import {
  listModNotesPage,
  parseModNotesButtonId,
  buildModNotesEmbed,
  buildModNotesButtons,
  defaultDiscordAvatarUrl,
  guildIdFromConfigOrThrow,
  type ModNoteTargetSnapshot,
} from '../services/modNotes.js'
import { memberCanRunModCommand, resolveModAccess } from '../utils/modAccess.js'
async function targetSnapshotFromPage(
  guildId: string,
  targetUserId: string,
  page: number,
): Promise<ModNoteTargetSnapshot | null> {
  const { notes } = await listModNotesPage(guildId, targetUserId, page)
  if (notes[0]) {
    return {
      target_discord_user_id: notes[0].target_discord_user_id,
      target_username: notes[0].target_username,
      target_display_name: notes[0].target_display_name,
      target_avatar_url: notes[0].target_avatar_url,
    }
  }
  const { notes: pageOne } = await listModNotesPage(guildId, targetUserId, 1)
  if (pageOne[0]) {
    return {
      target_discord_user_id: pageOne[0].target_discord_user_id,
      target_username: pageOne[0].target_username,
      target_display_name: pageOne[0].target_display_name,
      target_avatar_url: pageOne[0].target_avatar_url,
    }
  }
  return {
    target_discord_user_id: targetUserId,
    target_username: targetUserId,
    target_display_name: targetUserId,
    target_avatar_url: defaultDiscordAvatarUrl(targetUserId),
  }
}

export async function handleModNotesButton(interaction: ButtonInteraction): Promise<boolean> {
  const parsed = parseModNotesButtonId(interaction.customId)
  if (!parsed) return false

  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({
      content: 'This button only works inside the server.',
      flags: MessageFlags.Ephemeral,
    })
    return true
  }

  const actor =
    interaction.member instanceof GuildMember
      ? interaction.member
      : interaction.guild.members.cache.get(interaction.user.id) ??
        (await interaction.guild.members.fetch(interaction.user.id).catch(() => null))

  if (!actor) {
    await interaction.reply({
      content: 'Could not resolve your member record.',
      flags: MessageFlags.Ephemeral,
    })
    return true
  }

  const access = await resolveModAccess(actor)
  if (!memberCanRunModCommand(access)) {
    await interaction.reply({
      content:
        access.permissionLevel === 'member'
          ? 'Mod notes are for staff with a **moderator** or **full admin** role mapping.'
          : 'You are not authorized to browse mod notes.',
      flags: MessageFlags.Ephemeral,
    })
    return true
  }

  await interaction.deferUpdate()

  try {
    const guildId = guildIdFromConfigOrThrow()
    const target = await targetSnapshotFromPage(guildId, parsed.targetUserId, parsed.page)
    if (!target) {
      await interaction.editReply({ content: 'Could not load notes.', embeds: [], components: [] })
      return true
    }

    const { notes, page, totalPages, total } = await listModNotesPage(
      guildId,
      parsed.targetUserId,
      parsed.page,
    )
    const embed = await buildModNotesEmbed(target, notes, page, totalPages, total)
    const components = buildModNotesButtons(parsed.targetUserId, page, totalPages)
    await interaction.editReply({ embeds: [embed], components })
  } catch (err) {
    console.warn('[skz-bot] mod notes pagination failed:', err)
    await interaction.followUp({
      content: 'Could not load that page of notes.',
      flags: MessageFlags.Ephemeral,
    })
  }

  return true
}

export function registerModNotesButtons(client: Client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return
    if (!interaction.customId.startsWith('modnotes:')) return
    await handleModNotesButton(interaction)
  })
}
