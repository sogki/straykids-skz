import type { MessageReaction, PartialMessageReaction } from 'discord.js'

/** Normalise admin-stored emoji strings and Discord reaction keys. */
export function normalizeEmojiKey(emoji: string): string {
  const trimmed = emoji.trim()
  const custom = trimmed.match(/^<(a)?:([^:>]+):(\d+)>$/i)
  if (custom) {
    const animated = custom[1] ? 'a' : ''
    return `<${animated}:${custom[2]}:${custom[3]}>`
  }
  return trimmed
}

export function emojiKeyFromReaction(
  reaction: MessageReaction | PartialMessageReaction,
): string {
  const e = reaction.emoji
  if (e.id) {
    const prefix = e.animated ? 'a' : ''
    return `<${prefix}:${e.name ?? ''}:${e.id}>`
  }
  return normalizeEmojiKey(e.name ?? '')
}
