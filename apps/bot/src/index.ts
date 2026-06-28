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
import { registerModLogs } from './handlers/modLogs.js'
import { registerWelcomeGoodbye } from './handlers/welcomeGoodbye.js'
import { registerModNotesButtons } from './handlers/modNotesButtons.js'
import { registerAccountAgeGate } from './handlers/accountAgeGate.js'
import { registerContentModeration } from './handlers/contentModeration.js'
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
import {
  recordBotReady,
  recordBotOffline,
  startHealthHeartbeat,
  stopHealthHeartbeat,
} from './services/botHealth.js'
import { syncDiscordCache } from './services/syncDiscordCache.js'
import { startDailyQuestionPoller } from './services/dailyQuestionWorker.js'
import { startRotatingPresence, stopRotatingPresence } from './services/rotatingPresence.js'
import { startPlayerAuthHttpServer } from './http/server.js'
import { registerDiscordCommands } from './services/registerDiscordCommands.js'

// GuildMembers is a privileged intent — not requested here. Individual
// member fetches via REST still work for role assignment. If you need
// member-cache events, enable "Server Members Intent" in the Discord
// Developer Portal AND add GatewayIntentBits.GuildMembers below.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
})

registerReactionRoles(client)
registerButtonRoles(client)
registerVoiceHub(client)
registerModLogs(client)
registerWelcomeGoodbye(client)
registerModNotesButtons(client)
registerAccountAgeGate(client)
registerContentModeration(client)

async function onReady() {
  console.log(`[skz-bot] logged in as ${client.user?.tag}`)
  await recordBotReady()
  startHealthHeartbeat()
  startRotatingPresence(client)
  try {
    const cfg = await reloadBotConfig()
    console.log(
      `[skz-bot] config loaded: ${cfg.messages.length} panels, ${cfg.reactionRoles.filter((r) => r.isActive).length} active reaction roles`,
    )
    await syncDiscordCache(client)
    await processOutbox(client)
    const cmdReg = await registerDiscordCommands()
    console.log(
      `[skz-bot] slash commands registered (guild ${cmdReg.guildId}): ${cmdReg.guild?.join(', ')}`,
    )
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
let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[skz-bot] shutting down (${signal})`)
  stopHealthHeartbeat()
  stopRotatingPresence()
  await recordBotOffline().catch(() => {})
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
  await loadCredentialsFromDb()
  // Start HTTP before Discord login so Railway public URL responds immediately.
  startPlayerAuthHttpServer()
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

Enable these in the Discord Developer Portal → your app → Bot → Privileged Gateway Intents:
  • Server Members Intent   (member join logs, /info)
  • Message Content Intent  (reliable edit/delete log content)

If you do not want moderation logs yet, remove GuildMembers, GuildMessages,
and MessageContent from src/index.ts and unregister mod log handlers.
`)
  }
  console.error('[skz-bot] startup failed:', err)
  process.exit(1)
}
