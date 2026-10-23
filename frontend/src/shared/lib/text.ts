import { t } from '@/shared/lib/i18n'

// Same folding as backend/app/services/text.py, for filtering lists already on the client.
// Arabic code points that Persian keyboards and copy-paste use interchangeably
// with their Persian counterparts.
const FOLD: Record<string, string> = {
  '\u064A': '\u06CC', // Arabic yeh → Persian yeh
  '\u0649': '\u06CC', // alef maksura → Persian yeh
  '\u0626': '\u06CC', // yeh with hamza → Persian yeh
  '\u0643': '\u06A9', // Arabic kaf → Persian keheh
  '\u0629': '\u0647', // teh marbuta → heh
  '\u06C0': '\u0647', // heh with yeh → heh
  '\u0623': '\u0627', // alef with hamza above → alef
  '\u0625': '\u0627', // alef with hamza below → alef
  '\u0622': '\u0627', // alef with madda → alef
  '\u0624': '\u0648', // waw with hamza → waw
  '\u200C': ' ', // ZWNJ: a half-space and a space spell the same name
}
const FOLD_CHARS = new RegExp(`[${Object.keys(FOLD).join('')}]`, 'g')

export function fold(text: string): string {
  return text
    .replace(FOLD_CHARS, (c) => FOLD[c] ?? c)
    .replace(/[\u064B-\u065F\u0670]/g, '') // diacritics
    .replace(/[.,\u060C\u061B;]+/g, ' ') // Latin and Arabic comma/semicolon, dots
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function matches(haystack: string, query: string): boolean {
  const h = fold(haystack)
  return fold(query)
    .split(' ')
    .every((w) => h.includes(w))
}

export function initials(name: string): string {
  // Letters only: a trailing number or stray digit should not become an initial.
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((w) => /^[^\d\u06F0-\u06F9]/.test(w))
  if (parts.length === 0) return t('common.missing')
  if (parts.length === 1) return parts[0]!.slice(0, 2)
  // ZWNJ keeps the two Persian letters from joining into what looks like a word.
  return `${parts[0]![0]}\u200c${parts[parts.length - 1]![0]}`
}

/** Stable hue per name, so a patient keeps the same avatar colour everywhere. */
export function hueOf(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}
