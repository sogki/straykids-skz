import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js'
import { reloadCommand } from './reload.js'
import { panelCommand } from './panel.js'
import { leaderboardCommand } from './leaderboard.js'
import { profileCommand } from './profile.js'
import { infoCommand } from './info.js'

export interface SlashCommand {
  /** The slash command definition Discord registers. */
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | ReturnType<SlashCommandBuilder['toJSON']>
  /** Handler invoked when a user runs the command. */
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

/**
 * Add new commands here. They'll be auto-registered by `npm run register` and
 * auto-routed by the interaction handler in `src/index.ts`.
 */
/** Guild-scoped staff / mod commands (registered to configured guild). */
export const guildCommands: SlashCommand[] = [
  reloadCommand,
  panelCommand,
  infoCommand,
]

/** Global commands (DM + any server) — player leaderboard. */
export const globalCommands: SlashCommand[] = [leaderboardCommand, profileCommand]

export const commands: SlashCommand[] = [...guildCommands, ...globalCommands]

export const commandMap = new Map<string, SlashCommand>(
  commands.map((c) => {
    const name =
      typeof (c.data as SlashCommandBuilder).name === 'string'
        ? (c.data as SlashCommandBuilder).name
        : (c.data as { name: string }).name
    return [name, c]
  }),
)
