import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { pingCommand } from './ping.js'
import { reloadCommand } from './reload.js'
import { adminLoginCommand } from './adminlogin.js'

export interface SlashCommand {
  /** The slash command definition Discord registers. */
  data:
    | SlashCommandBuilder
    | ReturnType<SlashCommandBuilder['toJSON']>
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
  /** Handler invoked when a user runs the command. */
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

/**
 * Add new commands here. They'll be auto-registered by `npm run register` and
 * auto-routed by the interaction handler in `src/index.ts`.
 */
export const commands: SlashCommand[] = [pingCommand, reloadCommand, adminLoginCommand]

export const commandMap = new Map<string, SlashCommand>(
  commands.map((c) => {
    const name =
      typeof (c.data as SlashCommandBuilder).name === 'string'
        ? (c.data as SlashCommandBuilder).name
        : (c.data as { name: string }).name
    return [name, c]
  }),
)
