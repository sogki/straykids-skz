import { Events, type Client } from 'discord.js'
import { postGoodbyeMessage, postWelcomeMessage } from '../services/welcomeGoodbyeWriter.js'

export function registerWelcomeGoodbye(client: Client) {
  client.on(Events.GuildMemberAdd, (member) => {
    postWelcomeMessage(client, member).catch((err) =>
      console.warn('[skz-bot] welcome message failed:', err),
    )
  })

  client.on(Events.GuildMemberRemove, (member) => {
    postGoodbyeMessage(client, member).catch((err) =>
      console.warn('[skz-bot] goodbye message failed:', err),
    )
  })
}
