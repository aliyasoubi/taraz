import { jalaaliMonthLength, toGregorian, toJalaali } from 'jalaali-js'
import { faDigits } from './format'

export const MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]
// Saturday-first, as on an Iranian calendar.
export const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const WEEKDAY_NAMES = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']

export interface JDate {
  jy: number
  jm: number
  jd: number
}

const pad = (n: number) => String(n).padStart(2, '0')

function parseIso(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return [y!, m!, d!]
}

export function isoToJ(iso: string): JDate {
  const [y, m, d] = parseIso(iso)
  return toJalaali(y, m, d)
}

export function jToIso({ jy, jm, jd }: JDate): string {
  const g = toGregorian(jy, jm, jd)
  return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`
}

/** Today on the clinic's calendar (Tehran), whatever the phone's timezone. */
export function todayIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return parts
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = parseIso(iso)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [a, b] = [fromIso, toIso].map((s) => {
    const [y, m, d] = parseIso(s)
    return Date.UTC(y, m - 1, d)
  })
  return Math.round((b! - a!) / 86400000)
}

export function monthLength(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm)
}

/** 0 = Saturday … 6 = Friday */
export function weekdayIndex(iso: string): number {
  const [y, m, d] = parseIso(iso)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 1) % 7
}

export function formatJ(iso: string | null | undefined, style: 'long' | 'short' | 'numeric' = 'long'): string {
  if (!iso) return ''
  const { jy, jm, jd } = isoToJ(iso)
  if (style === 'numeric') return faDigits(`${jy}/${pad(jm)}/${pad(jd)}`)
  if (style === 'short') return `${faDigits(jd)} ${MONTHS[jm - 1]}`
  return `${faDigits(jd)} ${MONTHS[jm - 1]} ${faDigits(jy)}`
}

export function weekdayName(iso: string): string {
  return WEEKDAY_NAMES[weekdayIndex(iso)]!
}

/** «امروز», «دیروز», «۳ روز دیگر» … falling back to the date. */
export function relativeDay(iso: string): string {
  const diff = daysBetween(todayIso(), iso)
  if (diff === 0) return 'امروز'
  if (diff === -1) return 'دیروز'
  if (diff === 1) return 'فردا'
  if (diff < 0 && diff > -7) return `${faDigits(-diff)} روز پیش`
  if (diff > 0 && diff < 7) return `${faDigits(diff)} روز دیگر`
  return formatJ(iso, 'short')
}

export function monthKey(iso: string): string {
  const { jy, jm } = isoToJ(iso)
  return `${jy}-${pad(jm)}`
}

export function monthLabel(jy: number, jm: number): string {
  return `${MONTHS[jm - 1]} ${faDigits(jy)}`
}

export function currentJMonth(): { jy: number; jm: number } {
  const { jy, jm } = isoToJ(todayIso())
  return { jy, jm }
}

export function shiftMonth(jy: number, jm: number, delta: number): { jy: number; jm: number } {
  const idx = jy * 12 + (jm - 1) + delta
  return { jy: Math.floor(idx / 12), jm: (idx % 12) + 1 }
}
