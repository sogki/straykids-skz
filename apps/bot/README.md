# @skz/bot

The SKZ Arcade Discord bot. Built with [discord.js](https://discord.js.org/) v14 and TypeScript.

## Status

Minimal scaffold. Currently ships one `/ping` command to prove the wiring end-to-end. Add real commands under `src/commands/`.

## Local development

1. **Create a Discord app + bot** at https://discord.com/developers/applications. Grab the bot token (Bot tab) and the application ID (General Information tab).
2. **Copy env**: `cp .env.example .env` and fill in `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`. Set `DISCORD_GUILD_ID` to a test server's ID so slash commands update instantly.
3. **Install** from the repo root: `npm install`
4. **Register slash commands**: `npm run register --workspace=@skz/bot`
5. **Run**: `npm run dev --workspace=@skz/bot` (or from root: `npm run dev:bot`)
6. **Invite the bot** to your test server. From the Developer Portal → OAuth2 → URL Generator, pick `bot` + `applications.commands` scopes and the permissions you need (typically just `Send Messages`).

## Adding a command

Create `src/commands/myCommand.ts`, export an object that matches the `SlashCommand` interface from `src/commands/index.ts`, then add it to the `commands` array in `src/commands/index.ts`. Re-run `npm run register` whenever you change a command's `data` (name, description, options).

```ts
import { SlashCommandBuilder } from 'discord.js'
import type { SlashCommand } from './index.js'

export const helloCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hi.'),
  async execute(interaction) {
    await interaction.reply(`Hey ${interaction.user.username}!`)
  },
}
```

## Deploying to Railway

1. Create a new project from this repo on [Railway](https://railway.app).
2. Set the **Root Directory** to `apps/bot`. (Railway also supports monorepos via the `RAILWAY_DOCKERFILE_PATH` or `nixpacks.toml`, but root-directory is simplest.)
3. Set env vars in Railway: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and any optional ones.
4. Railway will detect Node, run `npm install`, then `npm run build`, then `npm run start`.
5. **First deploy**: SSH into the Railway shell (or run locally with prod env) and execute `npm run register --workspace=@skz/bot` once to push commands to Discord.

The bot uses a persistent Discord gateway connection — Railway's default web service is appropriate. No HTTP port is exposed.

## Sharing logic with the web app

This package depends on `@skz/shared` (see `packages/shared/`). That's where pure game logic lives — answer normalization, daily puzzle picking, etc. Don't duplicate; import from `@skz/shared`.

```ts
import { isAnswerCorrect, pickDailyPuzzle, getTodayKey } from '@skz/shared'
```
