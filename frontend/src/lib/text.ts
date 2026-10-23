// Same folding as backend/app/services/text.py, for filtering lists already on the client.
const FOLD: Record<string, string> = {
  ي: 'ی',
  ى: 'ی',
  ئ: 'ی',
  ك: 'ک',
  ة: 'ه',
  ۀ: 'ه',
  أ: 'ا',
  إ: 'ا',
  آ: 'ا',
  ؤ: 'و',
  '‌': ' ',
}

export function fold(text: string): string {
  return text
    .replace(/[يىئكةۀأإآؤ‌]/g, (c) => FOLD[c] ?? c)
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[.,،؛;]+/g, ' ')
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
  // Letters only: «آرمان ۲» or a stray digit should not become an initial.
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((w) => /^[^\d۰-۹]/.test(w))
  if (parts.length === 0) return '؟'
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
