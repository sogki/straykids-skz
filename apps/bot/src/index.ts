import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Partials,
} from 'discord.js'
import { commandMap } from './commands/index.js'
import { reloadBotConfig } from './db/botConfig.js'
import { loadCredentialsFromDb } from './db/credentials.js'
import { loginFromDatabase } from './discordSession.js'
import { bootstrapSupabaseFromDb } from './db/supabase.js'
import { registerButtonRoles } from './handlers/buttonRoles.js'
import { registerReactionRoles } from './handlers/reactionRoles.js'
import {
  cleanupOrphanedTempChannels,
  registerVoiceHub,
} from './handlers/voiceHub.js'
import {
  startOutboxPoller,
  processOutbox,
  startOutboxRealtime,
  stopOutboxRealtime,
} from './services/outboxWorker.js'
import { syncDiscordCache } from './services/syncDiscordCache.js'
import { startDailyQuestionPoller } from './services/dailyQuestionWorker.js'
import { startRotatingPresence, stopRotatingPresence } from './services/rotatingPresence.js'

// GuildMembers is a privileged intent — not requested here. Individual
// member fetches via REST still work for role assignment. If you need
// member-cache events, enable "Server Members Intent" in the Discord
// Developer Portal AND add GatewayIntentBits.GuildMembers below.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
})

registerReactionRoles(client)
registerButtonRoles(client)
registerVoiceHub(client)

async function onReady() {
  console.log(`[skz-bot] logged in as ${client.user?.tag}`)
  startRotatingPresence(client, discordApplicationId)
  try {
    const cfg = await reloadBotConfig()
    console.log(
      `[skz-bot] config loaded: ${cfg.messages.length} panels, ${cfg.reactionRoles.filter((r) => r.isActive).length} active reaction roles`,
    )
    await syncDiscordCache(client)
    await processOutbox(client)
  } catch (err) {
    console.error('[skz-bot] post-login setup failed:', err)
  }
  await cleanupOrphanedTempChannels(client)
}

client.once(Events.ClientReady, onReady)

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const command = commandMap.get(interaction.commandName)
  if (!command) return

  try {
    await command.execute(interaction)
  } catch (err) {
    console.error(`[skz-bot] /${interaction.commandName} failed:`, err)
    const errorMessage = 'Something went wrong running that command.'
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: errorMessage,
        flags: MessageFlags.Ephemeral,
      })
    } else {
      await interaction.reply({
        content: errorMessage,
        flags: MessageFlags.Ephemeral,
      })
    }
  }
})

let outboxPollerTimer: ReturnType<typeof setInterval> | undefined
let dailyQuestionPollerTimer: ReturnType<typeof setInterval> | undefined
let discordApplicationId = ''
let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[skz-bot] shutting down (${signal})`)
  stopRotatingPresence()
  if (outboxPollerTimer) clearInterval(outboxPollerTimer)
  if (dailyQuestionPollerTimer) clearInterval(dailyQuestionPollerTimer)
  stopOutboxRealtime()
  try {
    await client.destroy()
  } catch (err) {
    console.warn('[skz-bot] destroy failed:', err)
  }
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})
process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

// ── Bootstrap: Supabase (env one-time) → all secrets from DB → Discord login ──
try {
  await bootstrapSupabaseFromDb()
  const creds = await loadCredentialsFromDb()
  discordApplicationId = creds.discordClientId
  await loginFromDatabase(client)
  outboxPollerTimer = startOutboxPoller(client)
  startOutboxRealtime(client)
  dailyQuestionPollerTimer = startDailyQuestionPoller(client)
} catch (err) {
  const errCode =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: unknown }).code)
      : ''
  if (errCode === 'TokenInvalid') {
    console.error(`
[skz-bot] Discord rejected the token from skz_bot_settings.

The bot never reads DISCORD_TOKEN from .env — only the database row matters.
Fix: Admin → Discord bot → Credentials → paste a fresh bot token → Save settings → restart the bot.

If you recently reset the token in the Discord Developer Portal, update the DB value too.
`)
  } else if (err instanceof Error && err.message.includes('disallowed intents')) {
    console.error(`
[skz-bot] Discord rejected the connection: disallowed intents.

Enable these in the Discord Developer Portal → your app → Bot:
  • Server Members Intent   (only if you add GuildMembers intent in code)
  • (not needed for current build — reactions + voice work without it)

If you recently added intents in code, either enable them in the portal
or remove them from src/index.ts.
`)
  }
  console.error('[skz-bot] startup failed:', err)
  process.exit(1)
}
