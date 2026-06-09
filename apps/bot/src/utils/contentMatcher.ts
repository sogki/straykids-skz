import type { ContentFilterPattern } from '../services/securitySettings.js'

export type ContentMatchResult = {
  ruleId: string
  ruleLabel: string
  pattern: string
}

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
}

/** Strip invisible chars and homoglyph noise used to evade filters. */
export function normalizeMessageText(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/** Collapse leetspeak and repeated characters for secondary matching. */
export function softenMessageText(text: string): string {
  let out = normalizeMessageText(text)
  out = out.replace(/[013457@$]/g, (ch) => LEET_MAP[ch] ?? ch)
  out = out.replace(/(.)\1{2,}/g, '$1$1')
  return out
}

/** Letters and numbers only — catches c.p, c-p, c p style evasion. */
export function compactAlphanumeric(text: string): string {
  return softenMessageText(text).replace(/[^a-z0-9]/g, '')
}

function blockedTextFromPattern(meta: ContentFilterPattern): string {
  return String(meta.text ?? meta.label ?? '').trim()
}

export function invalidateContentMatcherCache() {
  // No regex cache — kept for /reload compatibility.
}

export function matchProhibitedContent(
  text: string,
  patterns: ContentFilterPattern[],
): ContentMatchResult | null {
  if (!text.trim() || !patterns.length) return null

  const normalized = normalizeMessageText(text)
  const softened = softenMessageText(text)
  const compact = compactAlphanumeric(text)

  for (const meta of patterns) {
    const needle = blockedTextFromPattern(meta)
    if (!needle) continue

    const normNeedle = normalizeMessageText(needle)
    const softNeedle = softenMessageText(needle)
    const compactNeedle = compactAlphanumeric(needle)

    const directHit =
      (normNeedle.length > 0 && normalized.includes(normNeedle)) ||
      (softNeedle.length > 0 && softened.includes(softNeedle))

    const compactHit =
      compactNeedle.length >= 2 &&
      compact.length >= compactNeedle.length &&
      compact.includes(compactNeedle)

    if (directHit || compactHit) {
      return {
        ruleId: meta.id,
        ruleLabel: meta.label,
        pattern: needle,
      }
    }
  }

  return null
}
