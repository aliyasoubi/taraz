import { messages, t } from './i18n'

export type Unit = 'rial' | 'toman'

const faInt = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 })
const faDec = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })

export const UNIT_LABEL: Record<Unit, string> = messages.units

const PERSIAN_ZERO = 0x06f0
const ARABIC_INDIC_ZERO = 0x0660

/** ASCII digits → Persian digits (U+06F0…U+06F9). */
export function faDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => String.fromCharCode(PERSIAN_ZERO + Number(d)))
}

/** Persian/Arabic-Indic digits → ASCII; everything that is not a digit is dropped. */
export function digitsOnly(text: string): string {
  return text
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - PERSIAN_ZERO))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - ARABIC_INDIC_ZERO))
    .replace(/\D/g, '')
}

export function toUnit(rial: number, unit: Unit): number {
  return unit === 'toman' ? rial / 10 : rial
}

export function fromUnit(value: number, unit: Unit): number {
  return unit === 'toman' ? value * 10 : value
}

export function formatNumber(n: number): string {
  return faInt.format(n)
}

export function formatMoney(rial: number, unit: Unit, opts: { sign?: boolean } = {}): string {
  const v = toUnit(Math.abs(rial), unit)
  const s = faInt.format(v)
  if (!opts.sign || rial === 0) return s
  return rial < 0 ? `−${s}` : `+${s}`
}

/** "1.2 billion", "350 million" in Persian — for tight spaces like cards and charts. */
export function formatCompact(rial: number, unit: Unit): string {
  const v = Math.abs(toUnit(rial, unit))
  const sign = rial < 0 ? '−' : ''
  if (v >= 1e12) return `${sign}${faDec.format(v / 1e12)} ${t('compact.trillion')}`
  if (v >= 1e9) return `${sign}${faDec.format(v / 1e9)} ${t('compact.billion')}`
  if (v >= 1e6) return `${sign}${faDec.format(v / 1e6)} ${t('compact.million')}`
  if (v >= 1e3) return `${sign}${faDec.format(v / 1e3)} ${t('compact.thousand')}`
  return `${sign}${faInt.format(v)}`
}

const { ones, teens, tens, hundreds, scales, and } = messages.numbers

function under1000(n: number): string {
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h) parts.push(hundreds[h]!)
  if (rest >= 10 && rest < 20) parts.push(teens[rest - 10]!)
  else {
    const tn = Math.floor(rest / 10)
    const o = rest % 10
    if (tn) parts.push(tens[tn]!)
    if (o) parts.push(ones[o]!)
  }
  return parts.join(and)
}

/**
 * The amount in words ("one billion and seven hundred million", in Persian).
 * Shown under the amount field so a missing or extra zero is obvious before saving —
 * the old spreadsheet had entries like "150,000,00".
 */
export function toWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return ''
  n = Math.floor(n)
  if (n >= 1e15) return ''
  const groups: string[] = []
  let scale = 0
  while (n > 0) {
    const chunk = n % 1000
    if (chunk) groups.unshift(`${under1000(chunk)}${scales[scale] ? ` ${scales[scale]}` : ''}`)
    n = Math.floor(n / 1000)
    scale++
  }
  return groups.join(and)
}

export function balanceTone(balance: number): 'debt' | 'credit' | 'settled' {
  if (balance > 0) return 'debt'
  if (balance < 0) return 'credit'
  return 'settled'
}

export const TONE_LABEL = messages.tone
