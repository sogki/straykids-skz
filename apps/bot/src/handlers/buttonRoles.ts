import { Events, GuildMember, MessageFlags, type Client } from 'discord.js'
import { getBotConfig } from '../db/botConfig.js'
import { applyReactionRoleChange, roleDisplayName } from '../utils/roleFeedback.js'
import { resolvePanelFeedback } from '../utils/panelFeedback.js'

function panelForRole(botMessageId: string | null) {
  if (!botMessageId) return undefined
  return getBotConfig().messages.find((m) => m.id === botMessageId)
}

async function safeEphemeralReply(interaction: any, content: string) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content })
      return
    }
    await interaction.reply({ content, flags: MessageFlags.Ephemeral })
  } catch (err) {
    console.warn('[skz-bot] could not send interaction feedback:', err)
  }
}

/**
 * Button-based reaction roles. Custom IDs are `rr:{reactionRoleRowId}`.
 * Ephemeral feedback is only possible here — not on raw message reactions.
 */
export function registerButtonRoles(client: Client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return
    if (!interaction.customId.startsWith('rr:')) return
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const roleRowId = interaction.customId.slice(3)
    const match = getBotConfig().reactionRoles.find(
      (r) => r.id === roleRowId && r.isActive,
    )
    if (!match) {
      await safeEphemeralReply(interaction, 'This role button is no longer active.')
      return
    }

    const member = interaction.member
    if (!member || !(member instanceof GuildMember)) return

    const panel = panelForRole(match.botMessageId)
    const label = match.label || match.category
    const roleName = roleDisplayName(interaction.guild, match.roleId, label)
    const isSticky = match.category === 'verify' || !match.removeOnUnreact

    try {
      const hadRole = member.roles.cache.has(match.roleId)

      if (hadRole && isSticky) {
        await safeEphemeralReply(
          interaction,
          resolvePanelFeedback(panel, 'already', member, roleName),
        )
        return
      }

      const result = await applyReactionRoleChange(
        member,
        match.roleId,
        label,
        hadRole ? 'remove' : 'add',
      )

      if (result === 'failed') {
        await safeEphemeralReply(
          interaction,
          resolvePanelFeedback(panel, 'error', member, roleName),
        )
        return
      }

      if (result === 'unchanged') {
        await safeEphemeralReply(
          interaction,
          resolvePanelFeedback(panel, 'already', member, roleName),
        )
        return
      }

      const feedbackKey = result === 'added' ? 'added' : 'removed'
      await safeEphemeralReply(
        interaction,
        resolvePanelFeedback(panel, feedbackKey, member, roleName),
      )
    } catch (err) {
      console.error('[skz-bot] button role failed:', err)
      await safeEphemeralReply(
        interaction,
        resolvePanelFeedback(panel, 'error', member, roleName),
      )
    }
  })
}
