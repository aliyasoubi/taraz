import { format as formatGregorian } from 'date-fns';
import {
  endOfMonth,
  format as formatJalali,
  getMonth,
  getYear,
  isValid,
  newDate,
} from 'date-fns-jalali';

import { toLatinDigits } from './persian-text';

/**
 * Dates are stored as Gregorian `yyyy-MM-dd` (Postgres `date`); the practice
 * reads and reports everything in Jalali. These helpers are the only place
 * the two calendars meet on the API side.
 */
export interface JalaliMonth {
  year: number;
  month: number; // 1..12
}

export interface MonthRange extends JalaliMonth {
  /** First day, Gregorian ISO. */
  start: string;
  /** Last day, Gregorian ISO. */
  end: string;
}

/** A Date at local midnight → `yyyy-MM-dd` on the Gregorian calendar. */
export function isoDate(date: Date): string {
  return formatGregorian(date, 'yyyy-MM-dd');
}

/** `yyyy-MM-dd` → a Date at local midnight. */
export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidMonth(year: number, month: number): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 1300 &&
    year <= 1500 &&
    month >= 1 &&
    month <= 12
  );
}

export function monthRange({ year, month }: JalaliMonth): MonthRange {
  const first = newDate(year, month - 1, 1);
  return {
    year,
    month,
    start: isoDate(first),
    end: isoDate(endOfMonth(first)),
  };
}

export function monthOf(iso: string): JalaliMonth {
  const date = fromIso(iso);
  return { year: getYear(date), month: getMonth(date) + 1 };
}

export function currentMonth(now: Date = new Date()): JalaliMonth {
  return { year: getYear(now), month: getMonth(now) + 1 };
}

/** The Jalali month before `m`. */
export function previousMonth({ year, month }: JalaliMonth): JalaliMonth {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 };
}

/** `yyyy-MM-dd` (Gregorian) → `1405/08/01`. */
export function toJalali(iso: string): string {
  return formatJalali(fromIso(iso), 'yyyy/MM/dd');
}

/**
 * A Jalali date as people type it — `1405-08-01`, `1405/8/1`, Persian digits —
 * → Gregorian `yyyy-MM-dd`, or null when it is not a real day.
 */
export function parseJalali(text: string): string | null {
  const match = /^\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s*$/.exec(
    toLatinDigits(text),
  );
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (!isValidMonth(year, month) || day < 1 || day > 31) return null;
  const date = newDate(year, month - 1, day);
  if (!isValid(date) || getMonth(date) !== month - 1) return null;
  return isoDate(date);
}
