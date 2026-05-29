import {
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js'
import { fetchMemberForInfo } from '../utils/memberInfo.js'
import { memberCanRunModCommand, resolveModAccess } from '../utils/modAccess.js'
import {
  createModNote,
  guildIdFromConfigOrThrow,
  replyWithModNotesPage,
  snapshotFromMember,
  snapshotFromUser,
  softDeleteModNote,
} from '../services/modNotes.js'
import type { SlashCommand } from './index.js'

export const notesCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('notes')
    .setDescription('Staff moderation notes for a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('View notes for a member (paginated).')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Member to look up').setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName('page')
            .setDescription('Page number (default 1)')
            .setMinValue(1)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a moderation note.')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Member the note is about').setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName('note')
            .setDescription('Note text (max 2000 characters)')
            .setRequired(true)
            .setMaxLength(2000),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a note by ID (from /notes view).')
        .addStringOption((opt) =>
          opt
            .setName('id')
            .setDescription('Note UUID')
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    if (!interaction.guildId || !interaction.guild) {
      await interaction.editReply('Run this command inside the server.')
      return
    }

    const actor =
      interaction.member instanceof GuildMember
        ? interaction.member
        : interaction.guild.members.cache.get(interaction.user.id) ??
          (await interaction.guild.members.fetch(interaction.user.id).catch(() => null))

    if (!actor) {
      await interaction.editReply('Could not resolve your member record.')
      return
    }

    const access = await resolveModAccess(actor)
    if (!memberCanRunModCommand(access)) {
      await interaction.editReply(
        access.permissionLevel === 'member'
          ? 'This command is for staff with a **moderator** or **full admin** role mapping in the admin panel — **member** roles cannot use it.'
          : 'You are not authorized to use `/notes`. Ask a full admin to map your Discord role to **moderator** or **full admin** under Role permissions.',
      )
      return
    }

    const sub = interaction.options.getSubcommand()
    const guildId = guildIdFromConfigOrThrow()

    if (sub === 'view') {
      const targetUser = interaction.options.getUser('user', true)
      const page = interaction.options.getInteger('page') ?? 1
      const targetMember =
        interaction.options.getMember('user') instanceof GuildMember
          ? (interaction.options.getMember('user') as GuildMember)
          : await fetchMemberForInfo(interaction.guildId, targetUser)

      const target = targetMember
        ? snapshotFromMember(targetMember)
        : snapshotFromUser(targetUser)

      await replyWithModNotesPage({
        target,
        page,
        editReply: (payload) => interaction.editReply(payload),
      })
      return
    }

    if (sub === 'add') {
      const targetUser = interaction.options.getUser('user', true)
      const noteText = interaction.options.getString('note', true)
      const targetMember =
        interaction.options.getMember('user') instanceof GuildMember
          ? (interaction.options.getMember('user') as GuildMember)
          : await fetchMemberForInfo(interaction.guildId, targetUser)

      const target = targetMember
        ? snapshotFromMember(targetMember)
        : snapshotFromUser(targetUser)

      await createModNote({
        guildId,
        target,
        authorUserId: actor.id,
        authorUsername: actor.user.username,
        body: noteText,
        source: 'discord',
      })

      await interaction.editReply(
        `Note added for **${target.target_display_name}** (\`${target.target_discord_user_id}\`). Use \`/notes view\` to review.`,
      )
      return
    }

    if (sub === 'remove') {
      const noteId = interaction.options.getString('id', true).trim()
      const removed = await softDeleteModNote(guildId, noteId)
      if (!removed) {
        await interaction.editReply('No active note found with that ID.')
        return
      }
      await interaction.editReply(`Note \`${noteId}\` removed.`)
    }
  },
}
