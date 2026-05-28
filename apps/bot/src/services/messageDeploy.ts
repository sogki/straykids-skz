import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  type TextChannel,
} from 'discord.js'
import { embedFromJson } from '../utils/embedFromJson.js'
import { getBotConfig, reloadBotConfig, type BotMessageRow } from '../db/botConfig.js'
import { getSupabase } from '../db/supabase.js'

function buttonStyleFromString(style: string | null): ButtonStyle {
  switch (style) {
    case 'primary':
      return ButtonStyle.Primary
    case 'success':
      return ButtonStyle.Success
    case 'danger':
      return ButtonStyle.Danger
    case 'secondary':
    default:
      return ButtonStyle.Secondary
  }
}

function parseCustomEmoji(emoji: string) {
  const match = emoji.match(/^<(a)?:(\w+):(\d+)>$/)
  if (!match) return emoji
  return { id: match[3], name: match[2], animated: !!match[1] }
}

export async function deployBotMessage(
  client: Client,
  messageId: string,
): Promise<string | null> {
  await reloadBotConfig()
  const panel = getBotConfig().messages.find((m) => m.id === messageId)
  if (!panel) throw new Error(`Bot message ${messageId} not found`)
  return deployPanel(client, panel)
}

async function deployPanel(
  client: Client,
  panel: BotMessageRow,
): Promise<string | null> {
  if (!panel.channelId) throw new Error('Panel has no channel_id')

  const channel = await client.channels.fetch(panel.channelId)
  if (!channel || !channel.isTextBased()) {
    throw new Error(`Channel ${panel.channelId} is not a text channel`)
  }

  const textChannel = channel as TextChannel
  const embed = embedFromJson(panel.embed)
  const roles = getBotConfig().reactionRoles.filter(
    (r) => r.botMessageId === panel.id && r.isActive,
  )

  const components: ActionRowBuilder<ButtonBuilder>[] = []
  const deployButtons =
    panel.interactionMode === 'button' ||
    panel.interactionMode === 'both' ||
    panel.kind === 'verify'

  if (deployButtons) {
    const buttonRoles = roles.slice(0, 25)
    for (let i = 0; i < buttonRoles.length; i += 5) {
      const row = new ActionRowBuilder<ButtonBuilder>()
      for (const rr of buttonRoles.slice(i, i + 5)) {
        const btn = new ButtonBuilder()
          .setCustomId(`rr:${rr.id}`)
          .setLabel(rr.label || rr.category)
          .setStyle(buttonStyleFromString(rr.buttonStyle))
        const em = rr.buttonEmoji || rr.emoji
        if (em) {
          const parsed = parseCustomEmoji(em)
          if (typeof parsed === 'string') btn.setEmoji(parsed)
          else btn.setEmoji(parsed)
        }
        row.addComponents(btn)
      }
      if (row.components.length) components.push(row)
    }
  }

  let discordMessageId = panel.discordMessageId

  if (discordMessageId) {
    try {
      const existing = await textChannel.messages.fetch(discordMessageId)
      await existing.edit({
        embeds: [embed],
        components,
      })
    } catch {
      discordMessageId = null
    }
  }

  if (!discordMessageId) {
    const sent = await textChannel.send({ embeds: [embed], components })
    discordMessageId = sent.id
  }

  await getSupabase()
    .from('skz_bot_messages')
    .update({ discord_message_id: discordMessageId, updated_at: new Date().toISOString() })
    .eq('id', panel.id)

  // Sync reaction-role rows with the live Discord message id.
  await getSupabase()
    .from('skz_bot_reaction_roles')
    .update({
      channel_id: panel.channelId,
      message_id: discordMessageId,
      updated_at: new Date().toISOString(),
    })
    .eq('bot_message_id', panel.id)

  if (
    panel.interactionMode === 'reaction' ||
    panel.interactionMode === 'both'
  ) {
    const msg = await textChannel.messages.fetch(discordMessageId)
    await Promise.allSettled(
      roles.map(async (rr) => {
        try {
          const parsed = parseCustomEmoji(rr.emoji)
          await msg.react(typeof parsed === 'string' ? parsed : parsed.id ?? rr.emoji)
        } catch (err) {
          console.warn(`[skz-bot] could not add reaction ${rr.emoji}:`, err)
        }
      }),
    )
  }

  await reloadBotConfig()
  console.log(`[skz-bot] deployed panel "${panel.slug}" → message ${discordMessageId}`)
  return discordMessageId
}
