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
import { emojiKeyFromReaction } from '../utils/discordEmoji.js'
import { applyReactionRoleChange } from '../utils/roleFeedback.js'

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

async function handleReactionRole(
  reaction: MessageReaction,
  user: User | PartialUser,
  match: ReactionRoleRow,
  action: 'add' | 'remove',
) {
  if (user.bot) return

  const member = await fetchMember(reaction, user)
  if (!member) return

  const label = match.label || match.category
  const result = await applyReactionRoleChange(member, match.roleId, label, action)

  if (result === 'added' || result === 'removed') {
    console.log(
      `[skz-bot] ${result === 'added' ? '+' : '-'}role ${match.roleId} → ${user.id} (${match.category}/${label})`,
    )
  }
}

export function registerReactionRoles(client: Client) {
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    const hydrated = await hydrateReaction(reaction)
    if (!hydrated) return

    const match = findReactionRole(hydrated.message.id, emojiKeyFromReaction(hydrated))
    if (!match) return

    await handleReactionRole(hydrated, user, match, 'add')
  })

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    const hydrated = await hydrateReaction(reaction)
    if (!hydrated) return

    const match = findReactionRole(hydrated.message.id, emojiKeyFromReaction(hydrated))
    if (!match) return

    if (match.category === 'verify') return

    if (!match.removeOnUnreact) return

    await handleReactionRole(hydrated, user, match, 'remove')
  })
}
