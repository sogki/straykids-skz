import {
  type Client,
  Events,
  type GuildMember,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User,
} from 'discord.js'
import { findReactionRole, type ReactionRoleRow } from '../db/botConfig.js'

/**
 * Discord emojis can be Unicode (e.g. ✅) or custom (e.g. <:name:id>).
 * Reaction events give us a `ReactionEmoji` — we normalise it into the
 * same string form admins type into the settings table.
 *
 *   Unicode:  "✅"
 *   Custom:   "<:name:12345>"  (or "<a:name:12345>" if animated)
 */
function emojiKey(reaction: MessageReaction | PartialMessageReaction): string {
  const e = reaction.emoji
  if (e.id) {
    const prefix = e.animated ? 'a' : ''
    return `<${prefix}:${e.name ?? ''}:${e.id}>`
  }
  return e.name ?? ''
}

async function hydrateReaction(
  reaction: MessageReaction | PartialMessageReaction,
): Promise<MessageReaction | null> {
  if (!reaction.partial) return reaction as MessageReaction
  try {
    return await reaction.fetch()
  } catch (err) {
    console.warn('[skz-bot] could not hydrate reaction:', err)
    return null
  }
}

async function fetchMember(
  reaction: MessageReaction,
  user: User | PartialUser,
): Promise<GuildMember | null> {
  const guild = reaction.message.guild
  if (!guild) return null
  try {
    return await guild.members.fetch(user.id)
  } catch (err) {
    console.warn(`[skz-bot] could not fetch member ${user.id}:`, err)
    return null
  }
}

async function applyRole(
  reaction: MessageReaction,
  user: User | PartialUser,
  match: ReactionRoleRow,
  action: 'add' | 'remove',
) {
  if (user.bot) return

  const member = await fetchMember(reaction, user)
  if (!member) return

  try {
    if (action === 'add') {
      if (member.roles.cache.has(match.roleId)) return
      await member.roles.add(match.roleId, `reaction-role: ${match.label || match.category}`)
      console.log(
        `[skz-bot] +role ${match.roleId} → ${user.id} (${match.category}/${match.label || '—'})`,
      )
    } else {
      if (!member.roles.cache.has(match.roleId)) return
      await member.roles.remove(
        match.roleId,
        `reaction-role removed: ${match.label || match.category}`,
      )
      console.log(
        `[skz-bot] -role ${match.roleId} → ${user.id} (${match.category}/${match.label || '—'})`,
      )
    }
  } catch (err) {
    console.error(
      `[skz-bot] could not ${action} role ${match.roleId} on ${user.id}:`,
      err,
    )
  }
}

export function registerReactionRoles(client: Client) {
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    const hydrated = await hydrateReaction(reaction)
    if (!hydrated) return

    const match = findReactionRole(hydrated.message.id, emojiKey(hydrated))
    if (!match) return

    await applyRole(hydrated, user, match, 'add')
  })

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    const hydrated = await hydrateReaction(reaction)
    if (!hydrated) return

    const match = findReactionRole(hydrated.message.id, emojiKey(hydrated))
    if (!match) return

    // Verify roles + any role flagged `remove_on_unreact = false` are sticky.
    if (!match.removeOnUnreact) return

    await applyRole(hydrated, user, match, 'remove')
  })
}
