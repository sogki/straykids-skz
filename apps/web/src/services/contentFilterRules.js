/**
 * @typedef {Object} BlockedTextRule
 * @property {string} id
 * @property {string} label
 * @property {string} text
 */

export const DEFAULT_BLOCKED_TEXTS = [
  { id: 'child_porn', label: 'child porn', text: 'child porn' },
  { id: 'csam', label: 'csam', text: 'csam' },
  { id: 'cp', label: 'cp', text: 'cp' },
  { id: 'pedo', label: 'pedo', text: 'pedo' },
  { id: 'pedophile', label: 'pedophile', text: 'pedophile' },
  { id: 'pedophilia', label: 'pedophilia', text: 'pedophilia' },
  { id: 'rape', label: 'rape', text: 'rape' },
  { id: 'bestiality', label: 'bestiality', text: 'bestiality' },
  { id: 'zoophilia', label: 'zoophilia', text: 'zoophilia' },
  { id: 'necrophilia', label: 'necrophilia', text: 'necrophilia' },
  { id: 'loli', label: 'loli', text: 'loli' },
  { id: 'lolicon', label: 'lolicon', text: 'lolicon' },
  { id: 'shota', label: 'shota', text: 'shota' },
  { id: 'shotacon', label: 'shotacon', text: 'shotacon' },
]

/** @deprecated alias */
export const DEFAULT_CONTENT_FILTER_RULES = DEFAULT_BLOCKED_TEXTS

export function slugFromLabel(label, fallback = 'rule') {
  const base = String(label ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return base || fallback
}

/**
 * @param {Partial<BlockedTextRule> & { matchValue?: string, pattern?: string }} row
 * @param {number} index
 * @returns {BlockedTextRule | null}
 */
function normalizeRule(row, index = 0) {
  if (!row || typeof row !== 'object') return null

  const text = String(row.text ?? row.matchValue ?? row.label ?? '').trim()
  if (!text) return null

  const label = String(row.label ?? text).trim() || text
  const id = String(row.id ?? '').trim() || slugFromLabel(text, `rule_${index + 1}`)

  return { id, label, text }
}

/**
 * @param {Record<string, string>} settings
 * @returns {BlockedTextRule[]}
 */
export function parseContentFilterRulesFromSettings(settings = {}) {
  const raw = String(settings.content_filter_patterns ?? '').trim()
  if (!raw) {
    return DEFAULT_BLOCKED_TEXTS.map((row) => ({ ...row }))
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return DEFAULT_BLOCKED_TEXTS.map((row) => ({ ...row }))
    }

    const rows = parsed
      .flatMap((row, index) => {
        if (row?.matchType === 'any_words' && row?.matchValue) {
          return String(row.matchValue)
            .split(',')
            .map((part) => normalizeRule({ ...row, text: part.trim() }, index))
            .filter(Boolean)
        }
        return [normalizeRule(row, index)]
      })
      .filter(Boolean)

    return rows.length ? rows : DEFAULT_BLOCKED_TEXTS.map((row) => ({ ...row }))
  } catch {
    return DEFAULT_BLOCKED_TEXTS.map((row) => ({ ...row }))
  }
}

/** @param {BlockedTextRule[]} rules */
export function contentFilterRulesToSettingsPayload(rules = []) {
  const cleaned = rules
    .map((row, index) => normalizeRule(row, index))
    .filter(Boolean)
    .map((row) => ({
      id: row.id,
      label: row.label,
      text: row.text,
    }))

  return {
    content_filter_patterns: cleaned.length ? JSON.stringify(cleaned) : '',
  }
}

/** @param {BlockedTextRule[]} a @param {BlockedTextRule[]} b */
export function contentFilterRulesEqual(a = [], b = []) {
  if (a.length !== b.length) return false
  return a.every((row, index) => {
    const other = b[index]
    return row.id === other.id && row.label === other.label && row.text === other.text
  })
}

export function parseExemptChannelIds(value) {
  return String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function exemptChannelIdsToValue(ids = []) {
  return ids
    .map((id) => String(id).trim())
    .filter(Boolean)
    .join(',')
}

export function nextBlockedTextId(existing = []) {
  const used = new Set(existing.map((row) => row.id))
  let n = existing.length + 1
  let id = `rule_${n}`
  while (used.has(id)) {
    n += 1
    id = `rule_${n}`
  }
  return id
}

export function createEmptyBlockedTextRule(existing = []) {
  return {
    id: nextBlockedTextId(existing),
    label: '',
    text: '',
  }
}

/** @param {BlockedTextRule} rule */
export function ruleHasValidationError(rule) {
  return !String(rule?.text ?? '').trim()
}

/** @deprecated */
export function compileContentFilterPattern() {
  return ''
}

/** @deprecated */
export function isValidContentFilterPattern() {
  return true
}
