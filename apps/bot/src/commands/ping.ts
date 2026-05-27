import { SlashCommandBuilder } from 'discord.js'
import type { SlashCommand } from './index.js'

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Sanity check — replies with the bot\'s round-trip latency.'),
  async execute(interaction) {
    const sent = await interaction.reply({
      content: 'Pinging…',
      fetchReply: true,
    })
    const latency = sent.createdTimestamp - interaction.createdTimestamp
    await interaction.editReply(
      `Pong — round trip \`${latency}ms\`, websocket \`${interaction.client.ws.ping}ms\`.`,
    )
  },
}
