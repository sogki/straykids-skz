import type { Client } from 'discord.js'
import { getSupabase } from '../db/supabase.js'
import { deployBotMessage } from './messageDeploy.js'
import { syncDiscordCache } from './syncDiscordCache.js'
import {
  processDailyQuestionWithResult,
  resetQotdSchedulerLockForToday,
} from './dailyQuestionWorker.js'

interface OutboxRow {
  id: string
  action: string
  payload: Record<string, unknown>
}

export async function processOutbox(client: Client): Promise<number> {
  const db = getSupabase()
  const { data, error } = await db
    .from('skz_bot_outbox')
    .select('id, action, payload')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) {
    console.warn('[skz-bot] outbox read failed:', error.message)
    return 0
  }

  const rows = (data ?? []) as OutboxRow[]
  if (!rows.length) return 0

  let processed = 0
  for (const row of rows) {
    await db
      .from('skz_bot_outbox')
      .update({ status: 'processing' })
      .eq('id', row.id)

    try {
      if (row.action === 'SYNC_GUILD_CACHE') {
        await syncDiscordCache(client)
      } else if (row.action === 'DEPLOY_MESSAGE') {
        const messageId = String(row.payload['message_id'] ?? '')
        if (!messageId) throw new Error('DEPLOY_MESSAGE missing message_id')
        await deployBotMessage(client, messageId)
      } else if (row.action === 'RUN_DAILY_QUESTION_NOW') {
        const result = await processDailyQuestionWithResult(client, { force: true })
        if (!result.posted) {
          throw new Error(result.reason || 'QOTD was not posted')
        }
      } else if (row.action === 'RESET_QOTD_SCHEDULER_LOCK') {
        const runDate = await resetQotdSchedulerLockForToday()
        console.log(`[skz-bot] QOTD scheduler lock cleared for ${runDate} UTC`)
      } else if (row.action === 'RUN_DAILY_QUESTION_SCHEDULER_TEST') {
        const result = await processDailyQuestionWithResult(client, { schedulerTest: true })
        if (!result.posted) {
          throw new Error(result.reason || 'QOTD scheduler test did not post')
        }
      } else {
        throw new Error(`Unknown outbox action: ${row.action}`)
      }

      await db
        .from('skz_bot_outbox')
        .update({
          status: 'done',
          processed_at: new Date().toISOString(),
          error: null,
        })
        .eq('id', row.id)
      processed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await db
        .from('skz_bot_outbox')
        .update({
          status: 'failed',
          processed_at: new Date().toISOString(),
          error: msg,
        })
        .eq('id', row.id)
      console.error(`[skz-bot] outbox ${row.id} failed:`, err)
    }
  }

  return processed
}

let outboxRealtimeChannel: ReturnType<ReturnType<typeof getSupabase>['channel']> | null = null

export function stopOutboxRealtime() {
  const channel = outboxRealtimeChannel
  outboxRealtimeChannel = null
  if (channel) {
    void channel.unsubscribe()
  }
}

/** Process outbox jobs as soon as admin queues them (poll remains as fallback). */
export function startOutboxRealtime(client: Client) {
  stopOutboxRealtime()
  const db = getSupabase()
  const channel = db
    .channel('skz_bot_outbox')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'skz_bot_outbox',
        filter: 'status=eq.pending',
      },
      () => {
        processOutbox(client).catch((err) =>
          console.warn('[skz-bot] outbox realtime error:', err),
        )
      },
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('[skz-bot] outbox realtime connected')
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[skz-bot] outbox realtime unavailable:', err?.message ?? status)
      }
    })

  outboxRealtimeChannel = channel
  return channel
}

export function startOutboxPoller(client: Client, intervalMs = 2000) {
  const tick = () => {
    processOutbox(client).catch((err) =>
      console.warn('[skz-bot] outbox poll error:', err),
    )
  }
  tick()
  return setInterval(tick, intervalMs)
}
