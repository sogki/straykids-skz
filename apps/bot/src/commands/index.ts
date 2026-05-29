import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'
import { reloadCommand } from './reload.js'
import { panelCommand } from './panel.js'
import { leaderboardCommand } from './leaderboard.js'
import { profileCommand } from './profile.js'
import { infoCommand } from './info.js'
import { notesCommand } from './notes.js'

export interface SlashCommand {
  /** The slash command definition Discord registers. */
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | ReturnType<SlashCommandBuilder['toJSON']>
  /** Handler invoked when a user runs the command. */
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

/**
 * Add new commands here. They'll be auto-registered by `npm run register` and
 * auto-routed by the interaction handler in `src/index.ts`.
 */
/** All slash commands — registered to the configured Stay Café guild only. */
export const guildCommands: SlashCommand[] = [
  reloadCommand,
  panelCommand,
  infoCommand,
  notesCommand,
  leaderboardCommand,
  profileCommand,
]

/** Intentionally empty — this bot is single-guild; clears stale global commands on register. */
export const globalCommands: SlashCommand[] = []

export const commands: SlashCommand[] = [...guildCommands]

export const commandMap = new Map<string, SlashCommand>(
  commands.map((c) => {
    const name =
      typeof (c.data as SlashCommandBuilder).name === 'string'
        ? (c.data as SlashCommandBuilder).name
        : (c.data as { name: string }).name
    return [name, c]
  }),
)
