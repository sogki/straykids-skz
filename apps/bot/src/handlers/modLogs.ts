import { Events, type Client, type Message, type PartialMessage } from 'discord.js'
import {
  logMemberJoin,
  logMessageBulkDelete,
  logMessageDelete,
  logMessageEdit,
} from '../services/modLogWriter.js'

async function hydrateMessage(message: Message | PartialMessage) {
  if (!message.partial) return message
  try {
    return await message.fetch()
  } catch {
    return message
  }
}

export function registerModLogs(client: Client) {
  client.on(Events.GuildMemberAdd, (member) => {
    logMemberJoin(client, member).catch((err) =>
      console.warn('[skz-bot] member join log failed:', err),
    )
  })

  client.on(Events.MessageDelete, async (message) => {
    const hydrated = await hydrateMessage(message)
    logMessageDelete(client, hydrated).catch((err) =>
      console.warn('[skz-bot] message delete log failed:', err),
    )
  })

  client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    const oldH = await hydrateMessage(oldMessage)
    const newH = await hydrateMessage(newMessage)
    logMessageEdit(client, oldH, newH).catch((err) =>
      console.warn('[skz-bot] message edit log failed:', err),
    )
  })

  client.on(Events.MessageBulkDelete, (messages, channel) => {
    logMessageBulkDelete(client, messages.values(), channel.id, channel.guildId).catch(
      (err) => console.warn('[skz-bot] bulk delete log failed:', err),
    )
  })
}
