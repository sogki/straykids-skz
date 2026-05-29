import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type EmbedBuilder,
  type GuildMember,
  type User,
} from 'discord.js'
import { discordAvatarUrl } from '@skz/shared'
import { getBotConfig } from '../db/botConfig.js'
import { getSupabase } from '../db/supabase.js'
import { buildConfiguredEmbed } from '../utils/buildConfiguredEmbed.js'
import { loadModNotesViewEmbed } from './modNotesSettings.js'

export const MOD_NOTES_PER_PAGE = 5

export type ModNoteRow = {
  id: string
  guild_id: string
  target_discord_user_id: string
  target_username: string
  target_display_name: string
  target_avatar_url: string
  author_discord_user_id: string
  author_username: string
  body: string
  source: string
  created_at: string
}

export type ModNoteTargetSnapshot = {
  target_discord_user_id: string
  target_username: string
  target_display_name: string
  target_avatar_url: string
}

export function guildIdFromConfigOrThrow(): string {
  const guildId = String(getBotConfig().settings.guildId ?? '').trim()
  if (!guildId) throw new Error('Guild ID is not configured in bot settings.')
  return guildId
}

export function defaultDiscordAvatarUrl(userId: string): string {
  return discordAvatarUrl(userId, null, 128)
}

export function snapshotFromMember(member: GuildMember): ModNoteTargetSnapshot {
  const hash = member.user.avatar
  return {
    target_discord_user_id: member.id,
    target_username: member.user.username,
    target_display_name: member.displayName || member.user.username,
    target_avatar_url: discordAvatarUrl(member.id, hash, 128),
  }
}

export function snapshotFromUser(user: User): ModNoteTargetSnapshot {
  return {
    target_discord_user_id: user.id,
    target_username: user.username,
    target_display_name: user.globalName || user.username,
    target_avatar_url: discordAvatarUrl(user.id, user.avatar, 128),
  }
}

export async function countModNotes(guildId: string, targetUserId: string): Promise<number> {
  const db = getSupabase()
  const { count, error } = await db
    .from('skz_bot_mod_notes')
    .select('id', { count: 'exact', head: true })
    .eq('guild_id', guildId)
    .eq('target_discord_user_id', targetUserId)
    .is('deleted_at', null)
  if (error) throw new Error(`Mod notes count failed: ${error.message}`)
  return count ?? 0
}

export async function listModNotesPage(
  guildId: string,
  targetUserId: string,
  page: number,
  perPage = MOD_NOTES_PER_PAGE,
): Promise<{ notes: ModNoteRow[]; total: number; page: number; totalPages: number }> {
  const safePage = Math.max(1, page)
  const offset = (safePage - 1) * perPage
  const db = getSupabase()

  const { data, error } = await db
    .from('skz_bot_mod_notes')
    .select(
      'id, guild_id, target_discord_user_id, target_username, target_display_name, target_avatar_url, author_discord_user_id, author_username, body, source, created_at',
    )
    .eq('guild_id', guildId)
    .eq('target_discord_user_id', targetUserId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (error) throw new Error(`Mod notes list failed: ${error.message}`)

  const total = await countModNotes(guildId, targetUserId)
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return {
    notes: (data ?? []) as ModNoteRow[],
    total,
    page: safePage,
    totalPages,
  }
}

export async function createModNote(input: {
  guildId: string
  target: ModNoteTargetSnapshot
  authorUserId: string
  authorUsername: string
  body: string
  source: 'discord' | 'admin_panel'
}): Promise<ModNoteRow> {
  const trimmed = input.body.trim()
  if (!trimmed || trimmed.length > 2000) {
    throw new Error('Note must be 1–2000 characters.')
  }

  const db = getSupabase()
  const { data, error } = await db
    .from('skz_bot_mod_notes')
    .insert({
      guild_id: input.guildId,
      target_discord_user_id: input.target.target_discord_user_id,
      target_username: input.target.target_username,
      target_display_name: input.target.target_display_name,
      target_avatar_url: input.target.target_avatar_url,
      author_discord_user_id: input.authorUserId,
      author_username: input.authorUsername,
      body: trimmed,
      source: input.source,
    })
    .select(
      'id, guild_id, target_discord_user_id, target_username, target_display_name, target_avatar_url, author_discord_user_id, author_username, body, source, created_at',
    )
    .single()

  if (error || !data) throw new Error(`Mod note create failed: ${error?.message ?? 'unknown'}`)
  return data as ModNoteRow
}

export async function softDeleteModNote(guildId: string, noteId: string): Promise<boolean> {
  const db = getSupabase()
  const { data, error } = await db
    .from('skz_bot_mod_notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('guild_id', guildId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  if (error) throw new Error(`Mod note delete failed: ${error.message}`)
  return Boolean(data)
}

function formatNoteTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `<t:${Math.floor(d.getTime() / 1000)}:f>`
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export async function buildModNotesEmbed(
  target: ModNoteTargetSnapshot,
  notes: ModNoteRow[],
  page: number,
  totalPages: number,
  total: number,
) {
  const template = await loadModNotesViewEmbed()
  const avatar =
    target.target_avatar_url || defaultDiscordAvatarUrl(target.target_discord_user_id)

  const embed = buildConfiguredEmbed(template, {
    target_display_name: target.target_display_name,
    target_username: target.target_username,
    target_user_id: target.target_discord_user_id,
    target_mention: `<@${target.target_discord_user_id}>`,
    page: String(page),
    total_pages: String(totalPages),
    total_notes: String(total),
    avatar_url: avatar,
    event_title: 'Mod notes',
  })

  if (!notes.length) {
    embed.addFields({
      name: 'No notes',
      value: 'There are no active notes for this member.',
      inline: false,
    })
  } else {
    for (const note of notes) {
      embed.addFields({
        name: `${formatNoteTime(note.created_at)} · ${note.author_username}`,
        value: `${truncate(note.body, 900)}\n\n\`ID: ${note.id}\``,
        inline: false,
      })
    }
  }

  return embed
}

export function buildModNotesButtons(targetUserId: string, page: number, totalPages: number) {
  if (totalPages <= 1) return []

  const row = new ActionRowBuilder<ButtonBuilder>()
  if (page > 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`modnotes:${targetUserId}:${page - 1}`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary),
    )
  }
  if (page < totalPages) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`modnotes:${targetUserId}:${page + 1}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary),
    )
  }
  return row.components.length ? [row] : []
}

export async function replyWithModNotesPage(options: {
  target: ModNoteTargetSnapshot
  page: number
  editReply: (payload: {
    embeds: EmbedBuilder[]
    components: ActionRowBuilder<ButtonBuilder>[]
  }) => Promise<unknown>
  update?: (payload: {
    embeds: EmbedBuilder[]
    components: ActionRowBuilder<ButtonBuilder>[]
  }) => Promise<unknown>
}) {
  const guildId = guildIdFromConfigOrThrow()

  const { notes, page, totalPages, total } = await listModNotesPage(
    guildId,
    options.target.target_discord_user_id,
    options.page,
  )

  const embed = await buildModNotesEmbed(options.target, notes, page, totalPages, total)
  const components = buildModNotesButtons(
    options.target.target_discord_user_id,
    page,
    totalPages,
  )

  const payload = { embeds: [embed], components }
  if (options.update) {
    await options.update(payload)
  } else {
    await options.editReply(payload)
  }
}

export function parseModNotesButtonId(customId: string): { targetUserId: string; page: number } | null {
  if (!customId.startsWith('modnotes:')) return null
  const parts = customId.split(':')
  if (parts.length !== 3) return null
  const targetUserId = parts[1] ?? ''
  const pageStr = parts[2] ?? ''
  const page = Number.parseInt(pageStr, 10)
  if (!targetUserId || !pageStr || !Number.isFinite(page) || page < 1) return null
  return { targetUserId, page }
}
