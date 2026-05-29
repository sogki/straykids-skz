import { discordAvatarUrl } from '@skz/shared'
import { getSupabaseClient } from '../lib/supabase/client'

/** Live Discord bot identity for admin message previews (synced by the bot). */
export function botDiscordPreviewFromSettings(settings = {}) {
  const userId = String(settings?.bot_discord_user_id ?? '').trim()
  const username = String(settings?.bot_username ?? '').trim()
  const globalName = String(settings?.bot_global_name ?? '').trim()
  const hash = String(settings?.bot_avatar_hash ?? '').trim() || null
  if (!userId) return null
  return {
    name: globalName || username || 'Bot',
    avatarUrl: discordAvatarUrl(userId, hash, 128),
    username,
  }
}

export const SECRET_PLACEHOLDER = '__SECRET_SET__'

const OPERATIONAL_KEYS = [
  'site_url',
  'guild_id',
  'verify_channel_id',
  'verify_message_id',
  'verify_emoji',
  'verify_role_id',
  'join_to_create_channel_id',
  'join_to_create_category_id',
  'join_to_create_name_pattern',
  'qotd_enabled',
  'qotd_channel_id',
  'qotd_post_hour_utc',
  'qotd_post_minute_utc',
  'qotd_thread_name_format',
  'qotd_ping_role_id',
  'welcome_enabled',
  'welcome_channel_id',
  'goodbye_enabled',
  'goodbye_channel_id',
  'welcome_embed',
  'goodbye_embed',
  'qotd_bonus_would_you_rather_post_day_utc',
  'qotd_bonus_would_you_rather_post_hour_utc',
  'qotd_bonus_would_you_rather_post_minute_utc',
  'qotd_bonus_throwback_thursday_post_day_utc',
  'qotd_bonus_throwback_thursday_post_hour_utc',
  'qotd_bonus_throwback_thursday_post_minute_utc',
  'mod_log_enabled',
  'mod_log_join_channel_id',
  'mod_log_message_channel_id',
  'mod_log_member_join',
  'mod_log_message_edits',
  'mod_log_message_deletes',
  'mod_log_message_bulk_deletes',
  'mod_log_embed_member',
  'mod_log_embed_message_delete',
  'mod_log_embed_message_edit',
  'mod_log_embed_message_bulk_delete',
  'mod_notes_view_embed',
]

const SECRET_KEYS = [
  'discord_token',
  'discord_client_id',
  'discord_client_secret',
  'supabase_url',
  'supabase_service_role_key',
]

const ALL_SETTING_KEYS = [...SECRET_KEYS, ...OPERATIONAL_KEYS]

export const SETTING_DEFAULTS = {
  discord_token: '',
  discord_client_id: '',
  discord_client_secret: '',
  supabase_url: '',
  supabase_service_role_key: '',
  site_url: 'https://skzarcade.com',
  guild_id: '',
  verify_channel_id: '',
  verify_message_id: '',
  verify_emoji: '',
  verify_role_id: '',
  join_to_create_channel_id: '',
  join_to_create_category_id: '',
  join_to_create_name_pattern: "{username}'s vc",
  qotd_enabled: 'false',
  qotd_channel_id: '',
  qotd_post_hour_utc: '12',
  qotd_post_minute_utc: '0',
  qotd_thread_name_format: 'QOTD • {date}',
  qotd_ping_role_id: '',
  qotd_bonus_would_you_rather_post_day_utc: '2',
  qotd_bonus_would_you_rather_post_hour_utc: '18',
  qotd_bonus_would_you_rather_post_minute_utc: '0',
  qotd_bonus_throwback_thursday_post_day_utc: '4',
  qotd_bonus_throwback_thursday_post_hour_utc: '18',
  qotd_bonus_throwback_thursday_post_minute_utc: '30',
  welcome_enabled: 'false',
  welcome_channel_id: '',
  goodbye_enabled: 'false',
  goodbye_channel_id: '',
  mod_log_enabled: 'false',
  mod_log_join_channel_id: '',
  mod_log_message_channel_id: '',
  mod_log_member_join: 'true',
  mod_log_message_edits: 'true',
  mod_log_message_deletes: 'true',
  mod_log_message_bulk_deletes: 'true',
}

export const MOD_LOG_EVENT_TYPES = [
  { value: '', label: 'All events' },
  { value: 'member_join', label: 'Member join' },
  { value: 'member_info', label: 'Account lookup (/info)' },
  { value: 'message_delete', label: 'Message deleted' },
  { value: 'message_edit', label: 'Message edited' },
  { value: 'message_bulk_delete', label: 'Bulk delete' },
]

/** Tailwind classes for mod log event badges in the admin viewer. */
export const MOD_LOG_EVENT_STYLES = {
  member_join: 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30',
  member_info: 'bg-violet-500/15 text-violet-200 ring-violet-500/30',
  message_delete: 'bg-red-500/15 text-red-200 ring-red-500/30',
  message_edit: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  message_bulk_delete: 'bg-red-500/15 text-red-200 ring-red-500/30',
}

export function channelNameMapFromDiscordCache(cache = []) {
  const map = new Map()
  for (const entry of cache) {
    if (entry?.entity_type === 'channel' && entry.entity_id) {
      map.set(entry.entity_id, entry.name)
    }
  }
  return map
}

export function modLogEventLabel(eventType) {
  const found = MOD_LOG_EVENT_TYPES.find((t) => t.value === eventType)
  return found?.label ?? eventType ?? '—'
}

export function modLogEventStyle(eventType) {
  return MOD_LOG_EVENT_STYLES[eventType] ?? 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30'
}

export function formatModLogUserLabel(tag, userId) {
  if (tag) return tag
  if (userId) return `User ${userId}`
  return null
}

export function formatModLogChannelLabel(row, channelNameMap) {
  const name =
    row.channel_name ||
    row.payload?.channel_name ||
    (row.channel_id && channelNameMap?.get(row.channel_id)) ||
    (row.payload?.channel_id && channelNameMap?.get(row.payload.channel_id))
  const id = row.channel_id || row.payload?.channel_id
  if (name) return `#${name}`
  if (id) return `Channel ${id}`
  return null
}

function formatModLogSamples(samples) {
  if (!Array.isArray(samples) || !samples.length) return null
  return samples
    .map((s) => {
      const author =
        s.author_tag || (s.author_id ? `User ${s.author_id}` : 'Unknown')
      const bit = s.content ? String(s.content).slice(0, 120) : '—'
      return `• ${author}: ${bit}`
    })
    .join('\n')
}

/**
 * Human-readable detail rows for the admin mod log viewer.
 * @returns {{ label: string, value: string, fullWidth?: boolean, pre?: boolean, mono?: boolean }[]}
 */
export function getModLogDetailRows(row, channelNameMap) {
  const p = row.payload && typeof row.payload === 'object' ? row.payload : {}
  const channel = formatModLogChannelLabel(row, channelNameMap)

  const detail = (label, value, opts = {}) => {
    if (value == null || value === '') return null
    return { label, value: String(value), ...opts }
  }

  switch (row.event_type) {
    case 'message_delete':
      return [
        detail(
          'Author',
          formatModLogUserLabel(p.author_tag, p.author_id || row.actor_user_id),
        ),
        detail('Channel', channel),
        detail('Message ID', row.message_id, { mono: true }),
        detail('Deleted content', p.content, { fullWidth: true, pre: true }),
      ].filter(Boolean)

    case 'message_edit':
      return [
        detail(
          'Author',
          formatModLogUserLabel(p.author_tag, p.author_id || row.actor_user_id),
        ),
        detail('Channel', channel),
        detail('Message ID', row.message_id, { mono: true }),
        detail('Before', p.before, { fullWidth: true, pre: true }),
        detail('After', p.after, { fullWidth: true, pre: true }),
      ].filter(Boolean)

    case 'message_bulk_delete': {
      const sampleText = formatModLogSamples(p.samples)
      return [
        detail('Channel', channel),
        detail('Messages removed', p.count != null ? String(p.count) : null),
        detail('Sample content', sampleText, { fullWidth: true, pre: true }),
      ].filter(Boolean)
    }

    case 'member_join':
    case 'member_info': {
      const roles =
        Array.isArray(p.role_names) && p.role_names.length
          ? p.role_names.join(', ')
          : null
      const rows = [
        detail('User', formatModLogUserLabel(p.tag, p.user_id || row.target_user_id)),
        detail('Display name', p.display_name),
        detail('Bot account', p.is_bot === true ? 'Yes' : p.is_bot === false ? 'No' : null),
        detail('Joined server', p.joined_at ? formatIsoDateTime(p.joined_at) : null),
        detail('Account created', p.account_created_at ? formatIsoDateTime(p.account_created_at) : null),
        detail('Roles', roles, { fullWidth: true }),
      ]
      if (row.event_type === 'member_info') {
        rows.unshift(
          detail(
            'Requested by',
            formatModLogUserLabel(p.requested_by_tag, row.actor_user_id),
          ),
        )
      }
      return rows.filter(Boolean)
    }

    default:
      return []
  }
}

function formatIsoDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export const EMPTY_EMBED = {
  title: '',
  description: '',
  color: 0x5865f2,
  url: '',
  author: { name: '', url: '', icon_url: '' },
  thumbnail: { url: '' },
  image: { url: '' },
  footer: { text: '', icon_url: '' },
  fields: [],
}

export const MOD_LOG_EMBED_SETTING_KEYS = {
  member: 'mod_log_embed_member',
  message_delete: 'mod_log_embed_message_delete',
  message_edit: 'mod_log_embed_message_edit',
  message_bulk_delete: 'mod_log_embed_message_bulk_delete',
}

export const MOD_LOG_EMBED_TEMPLATES = [
  {
    id: 'member',
    settingKey: MOD_LOG_EMBED_SETTING_KEYS.member,
    label: 'Member join & /info',
    description: 'Posted when someone joins or a mod runs /info.',
  },
  {
    id: 'message_delete',
    settingKey: MOD_LOG_EMBED_SETTING_KEYS.message_delete,
    label: 'Message deleted',
    description: 'Single message delete events.',
  },
  {
    id: 'message_edit',
    settingKey: MOD_LOG_EMBED_SETTING_KEYS.message_edit,
    label: 'Message edited',
    description: 'Before/after edit events.',
  },
  {
    id: 'message_bulk_delete',
    settingKey: MOD_LOG_EMBED_SETTING_KEYS.message_bulk_delete,
    label: 'Bulk delete',
    description: 'Moderator bulk purge events.',
  },
]

export const DEFAULT_MOD_LOG_EMBEDS = {
  member: {
    title: '{event_title}',
    description: '',
    color: 0x5865f2,
    url: '',
    author: { name: '', url: '', icon_url: '' },
    thumbnail: { url: '{avatar_url}' },
    image: { url: '' },
    footer: { text: 'Requested by {requested_by}', icon_url: '' },
    fields: [
      { name: 'User', value: '{tag}\n{mention}', inline: true },
      { name: 'Display name', value: '{displayname}', inline: true },
      { name: 'User ID', value: '`{user_id}`', inline: true },
      { name: 'Account created', value: '{account_created}', inline: false },
      { name: 'Joined server', value: '{joined_at}', inline: false },
      { name: 'Bot account', value: '{is_bot}', inline: true },
      { name: 'Roles', value: '{roles}', inline: false },
    ],
  },
  message_delete: {
    title: '{event_title}',
    description: '',
    color: 0xed4245,
    url: '',
    author: { name: '', url: '', icon_url: '' },
    thumbnail: { url: '' },
    image: { url: '' },
    footer: { text: '', icon_url: '' },
    fields: [
      { name: 'Author', value: '{author_tag} ({author_mention})', inline: true },
      { name: 'Channel', value: '{channel}', inline: true },
      { name: 'Message ID', value: '`{message_id}`', inline: true },
      { name: 'Content', value: '{content}', inline: false },
    ],
  },
  message_edit: {
    title: '{event_title}',
    description: '',
    color: 0xfee75c,
    url: '{url}',
    author: { name: '', url: '', icon_url: '' },
    thumbnail: { url: '' },
    image: { url: '' },
    footer: { text: '', icon_url: '' },
    fields: [
      { name: 'Author', value: '{author_tag} ({author_mention})', inline: true },
      { name: 'Channel', value: '{channel}', inline: true },
      { name: 'Message ID', value: '`{message_id}`', inline: true },
      { name: 'Before', value: '{before}', inline: false },
      { name: 'After', value: '{after}', inline: false },
    ],
  },
  message_bulk_delete: {
    title: '{event_title}',
    description: '',
    color: 0xed4245,
    url: '',
    author: { name: '', url: '', icon_url: '' },
    thumbnail: { url: '' },
    image: { url: '' },
    footer: { text: '', icon_url: '' },
    fields: [
      { name: 'Channel', value: '{channel}', inline: true },
      { name: 'Count', value: '{count}', inline: true },
      { name: 'Sample messages', value: '{samples}', inline: false },
    ],
  },
}

function normaliseEmbedShape(raw, fallback) {
  if (!raw || typeof raw !== 'object') {
    return {
      ...fallback,
      author: { ...EMPTY_EMBED.author, ...fallback.author },
      thumbnail: { ...EMPTY_EMBED.thumbnail, ...fallback.thumbnail },
      image: { ...EMPTY_EMBED.image, ...fallback.image },
      footer: { ...EMPTY_EMBED.footer, ...fallback.footer },
      fields: [...(fallback.fields || [])],
    }
  }
  return {
    ...fallback,
    ...raw,
    author: { ...EMPTY_EMBED.author, ...fallback.author, ...(raw.author || {}) },
    thumbnail: { ...EMPTY_EMBED.thumbnail, ...fallback.thumbnail, ...(raw.thumbnail || {}) },
    image: { ...EMPTY_EMBED.image, ...fallback.image, ...(raw.image || {}) },
    footer: { ...EMPTY_EMBED.footer, ...fallback.footer, ...(raw.footer || {}) },
    fields: Array.isArray(raw.fields) ? [...raw.fields] : [...(fallback.fields || [])],
  }
}

export function parseModLogEmbedJson(value, templateId, defaultsMap = DEFAULT_MOD_LOG_EMBEDS) {
  const fallback = defaultsMap[templateId] ?? EMPTY_EMBED
  if (!value?.trim()) return normaliseEmbedShape(null, fallback)
  try {
    return normaliseEmbedShape(JSON.parse(value), fallback)
  } catch {
    return normaliseEmbedShape(null, fallback)
  }
}

export function parseModLogEmbedsFromSettings(settings = {}) {
  const out = {}
  for (const t of MOD_LOG_EMBED_TEMPLATES) {
    out[t.id] = parseModLogEmbedJson(settings[t.settingKey], t.id)
  }
  return out
}

export function modLogEmbedsToSettingsPayload(embeds) {
  const payload = {}
  for (const t of MOD_LOG_EMBED_TEMPLATES) {
    const embed = embeds[t.id] ?? DEFAULT_MOD_LOG_EMBEDS[t.id]
    payload[t.settingKey] = JSON.stringify(embed)
  }
  return payload
}

/** Merge saved/partial embed with defaults so the editor never shows a blank template. */
export function mergeModLogEmbedForEditor(embed, templateId) {
  return normaliseEmbedShape(embed, DEFAULT_MOD_LOG_EMBEDS[templateId] ?? EMPTY_EMBED)
}

export function modLogEmbedsEqual(a, b) {
  for (const t of MOD_LOG_EMBED_TEMPLATES) {
    if (JSON.stringify(a[t.id]) !== JSON.stringify(b[t.id])) return false
  }
  return true
}

export const WELCOME_GOODBYE_EMBED_TEMPLATES = [
  {
    id: 'welcome',
    settingKey: 'welcome_embed',
    label: 'Welcome',
    description: 'Posted when a member joins (not bots).',
  },
  {
    id: 'goodbye',
    settingKey: 'goodbye_embed',
    label: 'Goodbye',
    description: 'Posted when a member leaves.',
  },
]

export const DEFAULT_WELCOME_GOODBYE_EMBEDS = {
  welcome: {
    title: 'Welcome to {server}!',
    description: 'Hey {mention} — glad you made it to Stay Café.',
    color: 0x57f287,
    url: '',
    author: { name: '', url: '', icon_url: '' },
    thumbnail: { url: '{avatar_url}' },
    image: { url: '' },
    footer: { text: '', icon_url: '' },
    fields: [
      { name: 'Member', value: '{tag}', inline: true },
      { name: 'Member #', value: '{member_count}', inline: true },
      { name: 'Account created', value: '{account_created}', inline: false },
    ],
  },
  goodbye: {
    title: 'Goodbye',
    description: '{mention} left the server.',
    color: 0xed4245,
    url: '',
    author: { name: '', url: '', icon_url: '' },
    thumbnail: { url: '{avatar_url}' },
    image: { url: '' },
    footer: { text: '', icon_url: '' },
    fields: [
      { name: 'Member', value: '{tag}', inline: true },
      { name: 'Left', value: '{left_at}', inline: true },
      { name: 'Joined', value: '{joined_at}', inline: false },
    ],
  },
}

export function parseWelcomeGoodbyeEmbedsFromSettings(settings = {}) {
  const out = {}
  for (const t of WELCOME_GOODBYE_EMBED_TEMPLATES) {
    out[t.id] = parseModLogEmbedJson(settings[t.settingKey], t.id, DEFAULT_WELCOME_GOODBYE_EMBEDS)
  }
  return out
}

export function welcomeGoodbyeEmbedsToSettingsPayload(embeds) {
  const payload = {}
  for (const t of WELCOME_GOODBYE_EMBED_TEMPLATES) {
    const embed = embeds[t.id] ?? DEFAULT_WELCOME_GOODBYE_EMBEDS[t.id]
    payload[t.settingKey] = JSON.stringify(embed)
  }
  return payload
}

export function mergeWelcomeGoodbyeEmbedForEditor(embed, templateId) {
  return normaliseEmbedShape(embed, DEFAULT_WELCOME_GOODBYE_EMBEDS[templateId] ?? EMPTY_EMBED)
}

export function welcomeGoodbyeEmbedsEqual(a, b) {
  for (const t of WELCOME_GOODBYE_EMBED_TEMPLATES) {
    if (JSON.stringify(a[t.id]) !== JSON.stringify(b[t.id])) return false
  }
  return true
}

export const MOD_NOTES_VIEW_EMBED_SETTING_KEY = 'mod_notes_view_embed'

export const DEFAULT_MOD_NOTES_VIEW_EMBED = {
  title: '{event_title} — {target_display_name}',
  description: '{target_mention} · `{target_user_id}`',
  color: 0x5865f2,
  url: '',
  author: { name: '', url: '', icon_url: '' },
  thumbnail: { url: '{avatar_url}' },
  image: { url: '' },
  footer: { text: 'Page {page} of {total_pages} · {total_notes} note(s)', icon_url: '' },
  fields: [],
}

const MOD_NOTES_VIEW_EMBED_DEFAULTS = { view: DEFAULT_MOD_NOTES_VIEW_EMBED }

export function parseModNotesViewEmbedFromSettings(settings = {}) {
  return parseModLogEmbedJson(
    settings[MOD_NOTES_VIEW_EMBED_SETTING_KEY],
    'view',
    MOD_NOTES_VIEW_EMBED_DEFAULTS,
  )
}

export function modNotesViewEmbedToSettingsPayload(embed) {
  return {
    [MOD_NOTES_VIEW_EMBED_SETTING_KEY]: JSON.stringify(
      embed ?? DEFAULT_MOD_NOTES_VIEW_EMBED,
    ),
  }
}

export function mergeModNotesViewEmbedForEditor(embed) {
  return normaliseEmbedShape(embed, DEFAULT_MOD_NOTES_VIEW_EMBED)
}

export function modNotesViewEmbedEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function normaliseConfig(raw) {
  const settingsRaw = raw?.settings && typeof raw.settings === 'object' ? raw.settings : {}
  const settings = { ...SETTING_DEFAULTS }
  for (const key of ALL_SETTING_KEYS) {
    if (typeof settingsRaw[key] === 'string') {
      settings[key] = settingsRaw[key]
    }
  }
  return {
    settings,
    reactionRoles: Array.isArray(raw?.reaction_roles) ? raw.reaction_roles : [],
    messages: Array.isArray(raw?.messages) ? raw.messages : [],
    discordCache: Array.isArray(raw?.discord_cache) ? raw.discord_cache : [],
    dailyQuestions: Array.isArray(raw?.daily_questions) ? raw.daily_questions : [],
    rolePermissions: Array.isArray(raw?.role_permissions) ? raw.role_permissions : [],
    userPermissions: Array.isArray(raw?.user_permissions) ? raw.user_permissions : [],
  }
}

export async function upsertUserPermission(code, { discord_user_id, label = '' }) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_upsert_user_permission', {
    p_code: code.trim(),
    p_discord_user_id: discord_user_id,
    p_label: label ?? '',
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function deleteUserPermission(code, discordUserId) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_delete_user_permission', {
    p_code: code.trim(),
    p_discord_user_id: discordUserId,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function fetchBotConfig(code) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_get_config', {
    p_code: code.trim(),
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function saveBotSettings(code, settings) {
  const supabase = await getSupabaseClient()
  const payload = {}
  for (const key of ALL_SETTING_KEYS) {
    const val = String(settings?.[key] ?? '').trim()
    payload[key] = val === SECRET_PLACEHOLDER ? SECRET_PLACEHOLDER : val
  }
  const { data, error } = await supabase.rpc('skz_admin_bot_set_settings', {
    p_code: code.trim(),
    p_settings: payload,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function listDiscordEntities(code, entityType = null) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_list_discord_entities', {
    p_code: code.trim(),
    p_entity_type: entityType,
  })
  if (error) throw error
  return Array.isArray(data) ? data : []
}

export async function queueBotAction(code, action, payload = {}) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_queue_action', {
    p_code: code.trim(),
    p_action: action,
    p_payload: payload,
  })
  if (error) throw error
  return data
}

export async function upsertBotMessage(code, input) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_upsert_message', {
    p_code: code.trim(),
    p_id: input.id ?? null,
    p_slug: input.slug,
    p_label: input.label ?? '',
    p_kind: input.kind ?? 'reaction_roles',
    p_channel_id: input.channel_id ?? '',
    p_embed: input.embed ?? EMPTY_EMBED,
    p_interaction_mode: input.interaction_mode ?? 'reaction',
    p_is_active: input.is_active !== false,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function deleteBotMessage(code, id) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_delete_message', {
    p_code: code.trim(),
    p_id: id,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function createReactionRole(code, input) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_create_reaction_role', {
    p_code: code.trim(),
    p_channel_id: String(input.channel_id ?? '').trim(),
    p_message_id: String(input.message_id ?? '').trim(),
    p_emoji: String(input.emoji ?? '').trim(),
    p_role_id: String(input.role_id ?? '').trim(),
    p_category: input.category || 'general',
    p_label: input.label || '',
    p_remove_on_unreact: input.remove_on_unreact !== false,
    p_bot_message_id: input.bot_message_id ?? null,
    p_button_style: input.button_style ?? null,
    p_button_emoji: input.button_emoji ?? '',
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function updateReactionRole(code, id, patch) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_update_reaction_role', {
    p_code: code.trim(),
    p_id: id,
    p_channel_id: patch.channel_id ?? null,
    p_message_id: patch.message_id ?? null,
    p_emoji: patch.emoji ?? null,
    p_role_id: patch.role_id ?? null,
    p_category: patch.category ?? null,
    p_label: patch.label ?? null,
    p_remove_on_unreact:
      typeof patch.remove_on_unreact === 'boolean' ? patch.remove_on_unreact : null,
    p_is_active: typeof patch.is_active === 'boolean' ? patch.is_active : null,
    p_bot_message_id: patch.bot_message_id ?? null,
    p_button_style: patch.button_style ?? null,
    p_button_emoji: patch.button_emoji ?? null,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function deleteReactionRole(code, id) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_delete_reaction_role', {
    p_code: code.trim(),
    p_id: id,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export const QOTD_QUESTION_TYPES = [
  { value: 'standard', label: 'Question of the day' },
  { value: 'would_you_rather', label: 'Would you rather' },
  { value: 'throwback_thursday', label: 'Throwback Thursday' },
]

/** UTC weekday 0=Sunday … 6=Saturday (matches bot getUTCDay()). */
export const QOTD_WEEKDAYS_UTC = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

export const QOTD_BONUS_POST_DAY_SETTINGS = {
  would_you_rather: 'qotd_bonus_would_you_rather_post_day_utc',
  throwback_thursday: 'qotd_bonus_throwback_thursday_post_day_utc',
}

export const QOTD_BONUS_SCHEDULE_SETTINGS = {
  would_you_rather: {
    day: 'qotd_bonus_would_you_rather_post_day_utc',
    hour: 'qotd_bonus_would_you_rather_post_hour_utc',
    minute: 'qotd_bonus_would_you_rather_post_minute_utc',
    defaultDay: '2',
    defaultHour: '18',
    defaultMinute: '0',
  },
  throwback_thursday: {
    day: 'qotd_bonus_throwback_thursday_post_day_utc',
    hour: 'qotd_bonus_throwback_thursday_post_hour_utc',
    minute: 'qotd_bonus_throwback_thursday_post_minute_utc',
    defaultDay: '4',
    defaultHour: '18',
    defaultMinute: '30',
  },
}

export function formatQotdUtcTimeFromDraft(draft, hourKey, minuteKey, fallbackHour = 12, fallbackMinute = 0) {
  const hour = Number.parseInt(String(draft?.[hourKey] ?? fallbackHour), 10)
  const minute = Number.parseInt(String(draft?.[minuteKey] ?? fallbackMinute), 10)
  const safeHour = Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : fallbackHour
  const safeMinute = Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : fallbackMinute
  return `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`
}

export function localTimePreviewFromUtc(utcTimeValue) {
  const [h, m] = String(utcTimeValue || '').split(':').map((part) => Number.parseInt(part, 10))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return ''
  const dt = new Date()
  dt.setUTCHours(h, m, 0, 0)
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function qotdWeekdayLabel(value) {
  return QOTD_WEEKDAYS_UTC.find((d) => d.value === String(value))?.label ?? '—'
}

export function normalizeQotdQuestionType(value) {
  const v = String(value || '').toLowerCase().trim()
  if (v === 'would_you_rather' || v === 'wyr') return 'would_you_rather'
  if (v === 'throwback_thursday' || v === 'throwback' || v === 'tbt') return 'throwback_thursday'
  return 'standard'
}

export function qotdTypeLabel(value) {
  return QOTD_QUESTION_TYPES.find((t) => t.value === value)?.label ?? 'Question of the day'
}

/** Parse bulk line: optional [wyr] or [throwback] prefix, else standard. */
export function parseBulkQotdLine(line) {
  const trimmed = String(line || '').trim()
  if (!trimmed) return null
  const match = trimmed.match(/^\[(wyr|would_you_rather|throwback|throwback_thursday|tbt|standard)\]\s*(.+)$/i)
  if (match) {
    return {
      question_type: normalizeQotdQuestionType(match[1]),
      prompt: match[2].trim(),
    }
  }
  return { question_type: 'standard', prompt: trimmed }
}

export async function createDailyQuestion(code, prompt, isActive = true, questionType = 'standard') {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_create_daily_question', {
    p_code: code.trim(),
    p_prompt: prompt,
    p_is_active: Boolean(isActive),
    p_question_type: normalizeQotdQuestionType(questionType),
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function updateDailyQuestion(code, id, patch) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_update_daily_question', {
    p_code: code.trim(),
    p_id: id,
    p_prompt: patch.prompt ?? null,
    p_is_active: typeof patch.is_active === 'boolean' ? patch.is_active : null,
    p_sort_order: Number.isFinite(patch.sort_order) ? patch.sort_order : null,
    p_question_type: patch.question_type ? normalizeQotdQuestionType(patch.question_type) : null,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function deleteDailyQuestion(code, id) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_delete_daily_question', {
    p_code: code.trim(),
    p_id: id,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function upsertRolePermission(
  code,
  { discord_role_id, permission_level, label, is_active = true, bot_feature_access = {} },
) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_upsert_role_permission', {
    p_code: code.trim(),
    p_discord_role_id: discord_role_id,
    p_permission_level: permission_level,
    p_label: label ?? '',
    p_is_active: Boolean(is_active),
    p_bot_feature_access: bot_feature_access ?? {},
  })
  if (error) throw error
  return normaliseConfig(data)
}

export async function deleteRolePermission(code, discordRoleId) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_admin_bot_delete_role_permission', {
    p_code: code.trim(),
    p_discord_role_id: discordRoleId,
  })
  if (error) throw error
  return normaliseConfig(data)
}

export const REACTION_ROLE_CATEGORIES = [
  { value: 'verify', label: 'Verify' },
  { value: 'pronouns', label: 'Pronouns' },
  { value: 'colors', label: 'Colors' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
]

export const BUTTON_STYLES = [
  { value: 'primary', label: 'Primary (blurple)' },
  { value: 'secondary', label: 'Secondary (grey)' },
  { value: 'success', label: 'Success (green)' },
  { value: 'danger', label: 'Danger (red)' },
]

export const INTERACTION_MODES = [
  { value: 'reaction', label: 'Reactions only' },
  { value: 'button', label: 'Buttons only' },
  { value: 'both', label: 'Reactions + buttons' },
]

export const MESSAGE_KINDS = [
  { value: 'verify', label: 'Verify panel' },
  { value: 'reaction_roles', label: 'Reaction roles panel' },
  { value: 'general', label: 'General embed' },
]

export function hexColorToInt(hex) {
  const clean = String(hex || '').replace('#', '')
  const n = parseInt(clean, 16)
  return Number.isFinite(n) ? n : 0x5865f2
}

export function intColorToHex(n) {
  return `#${(Number(n) >>> 0).toString(16).padStart(6, '0').slice(-6)}`
}

export function channelsFromCache(cache, kind = null) {
  return cache.filter((e) => {
    if (e.entity_type !== 'channel') return false
    if (!kind) return true
    const k = e.channel_type === 2 || e.channel_type === 13 ? 'voice' : 'text'
    return k === kind
  })
}

export function rolesFromCache(cache) {
  return cache.filter((e) => e.entity_type === 'role')
}
