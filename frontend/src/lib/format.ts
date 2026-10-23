export type Unit = 'rial' | 'toman'

const faInt = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 })
const faDec = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })

export const UNIT_LABEL: Record<Unit, string> = { rial: 'ریال', toman: 'تومان' }

export function faDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d)
}

/** Persian/Arabic-Indic digits → ASCII; everything that is not a digit is dropped. */
export function digitsOnly(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
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

/** «۱٫۲ میلیارد», «۳۵۰ میلیون» — for tight spaces like cards and charts. */
export function formatCompact(rial: number, unit: Unit): string {
  const v = Math.abs(toUnit(rial, unit))
  const sign = rial < 0 ? '−' : ''
  if (v >= 1e12) return `${sign}${faDec.format(v / 1e12)} هزار میلیارد`
  if (v >= 1e9) return `${sign}${faDec.format(v / 1e9)} میلیارد`
  if (v >= 1e6) return `${sign}${faDec.format(v / 1e6)} میلیون`
  if (v >= 1e3) return `${sign}${faDec.format(v / 1e3)} هزار`
  return `${sign}${faInt.format(v)}`
}

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده']
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'هزار میلیارد']

function under1000(n: number): string {
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h) parts.push(HUNDREDS[h]!)
  if (rest >= 10 && rest < 20) parts.push(TEENS[rest - 10]!)
  else {
    const t = Math.floor(rest / 10)
    const o = rest % 10
    if (t) parts.push(TENS[t]!)
    if (o) parts.push(ONES[o]!)
  }
  return parts.join(' و ')
}

/**
 * The amount in words: «یک میلیارد و هفتصد میلیون».
 * Shown under the amount field so a missing or extra zero is obvious before saving —
 * the old spreadsheet had entries like «150,000,00».
 */
export function toWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return ''
  n = Math.floor(n)
  if (n >= 1e15) return ''
  const groups: string[] = []
  let scale = 0
  while (n > 0) {
    const chunk = n % 1000
    if (chunk) groups.unshift(`${under1000(chunk)}${SCALES[scale] ? ` ${SCALES[scale]}` : ''}`)
    n = Math.floor(n / 1000)
    scale++
  }
  return groups.join(' و ')
}

export function balanceTone(balance: number): 'debt' | 'credit' | 'settled' {
  if (balance > 0) return 'debt'
  if (balance < 0) return 'credit'
  return 'settled'
}

export const TONE_LABEL = { debt: 'بدهکار', credit: 'بستانکار', settled: 'تسویه' } as const
