import { getSupabaseClient } from '../lib/supabase/client'
import { dailySongs as fallbackSongs } from '../data/dailySongs'
import { dailyMembers as fallbackMembers } from '../data/dailyMembers'
import { dailyLyrics as fallbackLyrics } from '../data/dailyLyrics'
import { getTodayKey, getDailyIndex } from '../utils/dailyPuzzle'

function mapSong(row) {
  return {
    id: row.slug,
    answers: Array.isArray(row.answers) ? row.answers : [],
    reveals: Array.isArray(row.reveals) ? row.reveals : [],
  }
}

function mapMember(row) {
  return {
    id: row.slug,
    questionType: row.question_type || 'trivia',
    prompt: row.prompt || '',
    displayAnswer: row.display_answer,
    answers: Array.isArray(row.answers) ? row.answers : [],
    reveals: Array.isArray(row.reveals) ? row.reveals : [],
  }
}

function mapLyric(row) {
  return {
    id: row.slug,
    song: row.song,
    displayAnswer: row.display_answer,
    answers: Array.isArray(row.answers) ? row.answers : [],
    reveals: Array.isArray(row.reveals) ? row.reveals : [],
  }
}

async function pickFromPool(fetchPool, fetchScheduled, mapRow, fallback, dateKey) {
  const scheduled = await fetchScheduled(dateKey)
  if (scheduled) return { ...scheduled, dateKey }

  const pool = await fetchPool()
  if (!pool.length) return null

  const index = getDailyIndex(dateKey, pool.length)
  const puzzle = pool[index]
  if (!puzzle) return null

  return { ...puzzle, dateKey }
}

export async function fetchDailySongPool() {
  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('skz_daily_songs')
      .select('slug, answers, reveals')
      .eq('is_active', true)

    if (error) throw error
    if (!data?.length) return fallbackSongs
    return data.map(mapSong)
  } catch (err) {
    console.warn('[skz] Using fallback daily songs:', err.message)
    return fallbackSongs
  }
}

export async function fetchScheduledPuzzle(dateKey = getTodayKey()) {
  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('skz_daily_schedule')
      .select('puzzle_date, song:skz_daily_songs!song_id (slug, answers, reveals)')
      .eq('puzzle_date', dateKey)
      .maybeSingle()

    if (error) throw error
    if (!data?.song) return null
    return mapSong(data.song)
  } catch {
    return null
  }
}

export async function getDailyPuzzle(dateKey = getTodayKey()) {
  return pickFromPool(
    fetchDailySongPool,
    fetchScheduledPuzzle,
    mapSong,
    fallbackSongs,
    dateKey
  )
}

export async function fetchDailyMemberPool() {
  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('skz_daily_members')
      .select('slug, question_type, prompt, display_answer, answers, reveals')
      .eq('is_active', true)

    if (error) throw error
    if (!data?.length) return fallbackMembers
    return data.map(mapMember)
  } catch (err) {
    console.warn('[skz] Using fallback daily members:', err.message)
    return fallbackMembers
  }
}

export async function fetchScheduledMemberPuzzle(dateKey = getTodayKey()) {
  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('skz_daily_member_schedule')
      .select(
        'puzzle_date, member:skz_daily_members!member_id (slug, question_type, prompt, display_answer, answers, reveals)'
      )
      .eq('puzzle_date', dateKey)
      .maybeSingle()

    if (error) throw error
    if (!data?.member) return null
    return mapMember(data.member)
  } catch {
    return null
  }
}

export async function getDailyMemberPuzzle(dateKey = getTodayKey()) {
  return pickFromPool(
    fetchDailyMemberPool,
    fetchScheduledMemberPuzzle,
    mapMember,
    fallbackMembers,
    dateKey
  )
}

export async function fetchDailyLyricPool() {
  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('skz_daily_lyrics')
      .select('slug, song, display_answer, answers, reveals')
      .eq('is_active', true)

    if (error) throw error
    if (!data?.length) return fallbackLyrics
    return data.map(mapLyric)
  } catch (err) {
    console.warn('[skz] Using fallback daily lyrics:', err.message)
    return fallbackLyrics
  }
}

export async function fetchScheduledLyricPuzzle(dateKey = getTodayKey()) {
  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('skz_daily_lyric_schedule')
      .select(
        'puzzle_date, lyric:skz_daily_lyrics!lyric_id (slug, song, display_answer, answers, reveals)'
      )
      .eq('puzzle_date', dateKey)
      .maybeSingle()

    if (error) throw error
    if (!data?.lyric) return null
    return mapLyric(data.lyric)
  } catch {
    return null
  }
}

export async function getDailyLyricPuzzle(dateKey = getTodayKey()) {
  return pickFromPool(
    fetchDailyLyricPool,
    fetchScheduledLyricPuzzle,
    mapLyric,
    fallbackLyrics,
    dateKey
  )
}
