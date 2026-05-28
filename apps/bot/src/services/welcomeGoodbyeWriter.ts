import type { Client, GuildMember, TextChannel } from 'discord.js'
import { buildConfiguredEmbed } from '../utils/buildConfiguredEmbed.js'
import { memberGreetingContext, type GreetingMember } from '../utils/modLogContext.js'
import { loadWelcomeGoodbyeSettings } from './welcomeGoodbyeSettings.js'

async function postEmbed(
  client: Client,
  channelId: string | null | undefined,
  embedJson: Parameters<typeof buildConfiguredEmbed>[0],
  ctx: Record<string, string | undefined>,
) {
  if (!channelId) return
  const channel = await client.channels.fetch(channelId)
  if (!channel?.isTextBased()) return
  const embed = buildConfiguredEmbed(embedJson, ctx)
  await (channel as TextChannel).send({ embeds: [embed] })
}

export async function postWelcomeMessage(client: Client, member: GuildMember) {
  const settings = await loadWelcomeGoodbyeSettings()
  if (!settings.welcomeEnabled) return
  if (settings.guildId && member.guild.id !== settings.guildId) return
  if (member.user.bot) return
  if (!settings.welcomeChannelId) return

  const ctx = memberGreetingContext(member, 'Welcome')
  await postEmbed(client, settings.welcomeChannelId, settings.welcomeEmbed, ctx)
}

export async function postGoodbyeMessage(client: Client, member: GreetingMember) {
  const settings = await loadWelcomeGoodbyeSettings()
  if (!settings.goodbyeEnabled) return
  if (settings.guildId && member.guild.id !== settings.guildId) return
  if (member.user.bot) return
  if (!settings.goodbyeChannelId) return

  const ctx = memberGreetingContext(member, 'Goodbye', { includeLeftAt: true })
  await postEmbed(client, settings.goodbyeChannelId, settings.goodbyeEmbed, ctx)
}
