import type { Client, TextChannel } from 'discord.js'
import { getSupabase } from '../db/supabase.js'

type QuestionType = 'standard' | 'would_you_rather' | 'throwback_thursday'

const BONUS_TYPES: Array<{
  type: Exclude<QuestionType, 'standard'>
  dayKey: string
  hourKey: string
  minuteKey: string
  defaultDay: number
  defaultHour: number
  defaultMinute: number
}> = [
  {
    type: 'would_you_rather',
    dayKey: 'qotd_bonus_would_you_rather_post_day_utc',
    hourKey: 'qotd_bonus_would_you_rather_post_hour_utc',
    minuteKey: 'qotd_bonus_would_you_rather_post_minute_utc',
    defaultDay: 2,
    defaultHour: 18,
    defaultMinute: 0,
  },
  {
    type: 'throwback_thursday',
    dayKey: 'qotd_bonus_throwback_thursday_post_day_utc',
    hourKey: 'qotd_bonus_throwback_thursday_post_hour_utc',
    minuteKey: 'qotd_bonus_throwback_thursday_post_minute_utc',
    defaultDay: 4,
    defaultHour: 18,
    defaultMinute: 30,
  },
]

interface BonusSchedule {
  postDayUtc: number
  hourUtc: number
  minuteUtc: number
}

interface QotdSettings {
  enabled: boolean
  channelId: string
  hourUtc: number
  minuteUtc: number
  threadNameFormat: string
  bonusSchedule: Record<Exclude<QuestionType, 'standard'>, BonusSchedule>
}

function parseIntClamped(value: string | undefined, min: number, max: number, fallback: number) {
  const n = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

async function loadQotdSettings(): Promise<QotdSettings> {
  const db = getSupabase()
  const { data, error } = await db
    .from('skz_bot_settings')
    .select('key, value')
    .in('key', [
      'qotd_enabled',
      'qotd_channel_id',
      'qotd_post_hour_utc',
      'qotd_post_minute_utc',
      'qotd_thread_name_format',
      ...BONUS_TYPES.flatMap((b) => [b.dayKey, b.hourKey, b.minuteKey]),
    ])
  if (error) throw new Error(`QOTD settings read failed: ${error.message}`)

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[String(row.key)] = String(row.value ?? '')
  const bonusSchedule = Object.fromEntries(
    BONUS_TYPES.map((bonus) => [
      bonus.type,
      {
        postDayUtc: parseIntClamped(map[bonus.dayKey], 0, 6, bonus.defaultDay),
        hourUtc: parseIntClamped(map[bonus.hourKey], 0, 23, bonus.defaultHour),
        minuteUtc: parseIntClamped(map[bonus.minuteKey], 0, 59, bonus.defaultMinute),
      },
    ]),
  ) as Record<Exclude<QuestionType, 'standard'>, BonusSchedule>
  return {
    enabled: String(map['qotd_enabled'] ?? 'false').toLowerCase() === 'true',
    channelId: String(map['qotd_channel_id'] ?? '').trim(),
    hourUtc: parseIntClamped(map['qotd_post_hour_utc'], 0, 23, 12),
    minuteUtc: parseIntClamped(map['qotd_post_minute_utc'], 0, 59, 0),
    threadNameFormat: String(map['qotd_thread_name_format'] ?? 'QOTD • {date}').trim() || 'QOTD • {date}',
    bonusSchedule,
  }
}

function utcDateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatQotdMessage(questionType: string, prompt: string) {
  const type = String(questionType || 'standard').toLowerCase()
  if (type === 'would_you_rather') {
    return `## Would You Rather?\n\n${prompt}`
  }
  if (type === 'throwback_thursday') {
    return `## Throwback Thursday\n\n${prompt}`
  }
  return `## Question of the Day\n\n${prompt}`
}

function threadNameForType(
  questionType: QuestionType,
  threadNameFormat: string,
  dateLabel: string,
) {
  if (questionType === 'would_you_rather') return `WYR • ${dateLabel}`
  if (questionType === 'throwback_thursday') return `Throwback • ${dateLabel}`
  return threadNameFormat.replaceAll('{date}', dateLabel)
}

function formatUtcTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function isTypeScheduledNow(
  questionType: QuestionType,
  settings: QotdSettings,
  now: Date,
  checkSchedule: boolean,
): boolean {
  const utcWeekday = now.getUTCDay()
  if (questionType === 'standard') {
    if (!checkSchedule) return true
    return now.getUTCHours() === settings.hourUtc && now.getUTCMinutes() === settings.minuteUtc
  }

  const bonus = settings.bonusSchedule[questionType]
  if (bonus.postDayUtc !== utcWeekday) return false
  if (!checkSchedule) return true
  return now.getUTCHours() === bonus.hourUtc && now.getUTCMinutes() === bonus.minuteUtc
}

function typesDueNow(
  settings: QotdSettings,
  now: Date,
  options: { force?: boolean; schedulerTest?: boolean },
): QuestionType[] {
  const checkSchedule = options.force !== true
  const types: QuestionType[] = []
  if (isTypeScheduledNow('standard', settings, now, checkSchedule)) types.push('standard')
  for (const bonus of BONUS_TYPES) {
    if (isTypeScheduledNow(bonus.type, settings, now, checkSchedule)) types.push(bonus.type)
  }
  return types
}

export interface DailyQuestionRunResult {
  posted: boolean
  postedTypes?: QuestionType[]
  reason?: string
}

export async function resetQotdSchedulerLockForToday(): Promise<string> {
  const db = getSupabase()
  const runDate = utcDateKey(new Date())
  const { error } = await db.from('skz_bot_daily_question_runs').delete().eq('run_date', runDate)
  if (error) throw new Error(`Could not reset QOTD scheduler lock: ${error.message}`)
  return runDate
}

async function acquireRunLock(
  db: ReturnType<typeof getSupabase>,
  runDate: string,
  channelId: string,
  questionType: QuestionType,
  options: { force?: boolean },
): Promise<{ acquired: boolean; reason?: string }> {
  if (options.force === true) {
    const { error: upsertErr } = await db.from('skz_bot_daily_question_runs').upsert(
      {
        run_date: runDate,
        question_type: questionType,
        channel_id: channelId,
        status: 'skipped',
      },
      { onConflict: 'run_date,question_type' },
    )
    if (upsertErr) {
      return {
        acquired: false,
        reason: upsertErr.message
          ? `Could not prepare forced run (${questionType}): ${upsertErr.message}`
          : `Could not prepare forced run (${questionType})`,
      }
    }
    return { acquired: true }
  }

  const { data: lockRow, error: lockErr } = await db
    .from('skz_bot_daily_question_runs')
    .insert({
      run_date: runDate,
      question_type: questionType,
      channel_id: channelId,
      status: 'skipped',
    })
    .select('run_date')
    .maybeSingle()
  if (lockErr || !lockRow) {
    const msg = String(lockErr?.message ?? '')
    const code = String(lockErr?.code ?? '')
    if (code === '23505' || msg.toLowerCase().includes('duplicate key')) {
      return {
        acquired: false,
        reason: `${questionType} already ran for ${runDate} UTC`,
      }
    }
    return {
      acquired: false,
      reason: lockErr?.message
        ? `Could not create run row (${questionType}): ${lockErr.message}`
        : `Could not create run row (${questionType})`,
    }
  }
  return { acquired: true }
}

async function postQuestionType(
  client: Client,
  settings: QotdSettings,
  runDate: string,
  now: Date,
  questionType: QuestionType,
  options: { force?: boolean },
): Promise<DailyQuestionRunResult> {
  const db = getSupabase()
  const lock = await acquireRunLock(db, runDate, settings.channelId, questionType, options)
  if (!lock.acquired) {
    return { posted: false, reason: lock.reason }
  }

  const { data: question, error: qErr } = await db
    .from('skz_bot_daily_questions')
    .select('id, prompt, question_type, post_count')
    .eq('is_active', true)
    .eq('question_type', questionType)
    .order('last_posted_at', { ascending: true, nullsFirst: true })
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (qErr || !question) {
    const errMsg = qErr?.message ?? `No active ${questionType} questions`
    await db
      .from('skz_bot_daily_question_runs')
      .update({ status: 'failed', error: errMsg })
      .eq('run_date', runDate)
      .eq('question_type', questionType)
    return { posted: false, reason: errMsg }
  }

  try {
    const channel = await client.channels.fetch(settings.channelId)
    if (!channel || !channel.isTextBased()) throw new Error('QOTD channel is not text-based')
    const textChannel = channel as TextChannel
    const message = await textChannel.send({
      content: formatQotdMessage(String(question.question_type ?? questionType), question.prompt),
    })

    const dateLabel = now.toISOString().slice(0, 10)
    const threadName = threadNameForType(questionType, settings.threadNameFormat, dateLabel)
    const thread = await message.startThread({
      name: threadName,
      autoArchiveDuration: 1440,
    })

    await db
      .from('skz_bot_daily_questions')
      .update({
        last_posted_at: now.toISOString(),
        post_count: Number(question.post_count ?? 0) + 1,
      })
      .eq('id', question.id)

    await db
      .from('skz_bot_daily_question_runs')
      .update({
        question_id: question.id,
        message_id: message.id,
        thread_id: thread.id,
        status: 'posted',
        error: null,
      })
      .eq('run_date', runDate)
      .eq('question_type', questionType)

    return { posted: true, postedTypes: [questionType] }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    await db
      .from('skz_bot_daily_question_runs')
      .update({
        question_id: question.id,
        status: 'failed',
        error: errMsg,
      })
      .eq('run_date', runDate)
      .eq('question_type', questionType)
    return { posted: false, reason: errMsg }
  }
}

async function runDailyQuestion(
  client: Client,
  options: { force?: boolean; schedulerTest?: boolean } = {},
): Promise<DailyQuestionRunResult> {
  const now = new Date()
  const settings = await loadQotdSettings()
  if (!settings.enabled) return { posted: false, reason: 'QOTD is disabled' }
  if (!settings.channelId) return { posted: false, reason: 'QOTD target channel is not set' }

  const typesToRun = typesDueNow(settings, now, options)
  if (typesToRun.length === 0) {
    return {
      posted: false,
      reason: `No QOTD types scheduled for current UTC time (${formatUtcTime(now.getUTCHours(), now.getUTCMinutes())})`,
    }
  }

  const runDate = utcDateKey(now)
  const db = getSupabase()

  if (options.schedulerTest === true) {
    await db.from('skz_bot_daily_question_runs').delete().eq('run_date', runDate)
  }

  const postedTypes: QuestionType[] = []
  const skippedReasons: string[] = []

  for (const questionType of typesToRun) {
    const result = await postQuestionType(client, settings, runDate, now, questionType, options)
    if (result.posted) {
      postedTypes.push(questionType)
    } else if (result.reason) {
      skippedReasons.push(`${questionType}: ${result.reason}`)
    }
  }

  if (postedTypes.length > 0) {
    return { posted: true, postedTypes }
  }
  return {
    posted: false,
    reason: skippedReasons.join('; ') || 'Nothing posted',
  }
}

export async function processDailyQuestionWithResult(
  client: Client,
  options: { force?: boolean; schedulerTest?: boolean } = {},
): Promise<DailyQuestionRunResult> {
  return runDailyQuestion(client, options)
}

export async function processDailyQuestion(
  client: Client,
  options: { force?: boolean; schedulerTest?: boolean } = {},
): Promise<boolean> {
  const result = await runDailyQuestion(client, options)
  return result.posted
}

export function startDailyQuestionPoller(client: Client, intervalMs = 60_000) {
  const tick = () =>
    processDailyQuestion(client).catch((err) =>
      console.warn('[skz-bot] daily question poll failed:', err),
    )
  tick()
  return setInterval(tick, intervalMs)
}
