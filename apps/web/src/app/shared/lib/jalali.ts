import { format as formatGregorian } from 'date-fns';
import { format, getMonth, getYear } from 'date-fns-jalali';

import { JALALI_MONTH_KEYS } from '../../core/jalali/jalali-date-adapter';
import type { JalaliMonth } from '../../core/models/api.model';
import { persianDigits } from './money';

/**
 * The API stores calendar days as Gregorian `yyyy-MM-dd`; the practice reads
 * Jalali. Dates in forms are plain `Date`s at local midnight (the datepicker's
 * value), converted at the edge.
 */
export function toIsoDay(date: Date): string {
  return formatGregorian(date, 'yyyy-MM-dd');
}

export function fromIsoDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** `2026-10-23` → `۱۴۰۵/۰۸/۰۱`. */
export function jalaliDay(iso: string | null | undefined): string {
  return iso ? persianDigits(format(fromIsoDay(iso), 'yyyy/MM/dd')) : '—';
}

export function monthOf(date: Date): JalaliMonth {
  return { year: getYear(date), month: getMonth(date) + 1 };
}

export function shiftMonth({ year, month }: JalaliMonth, by: number): JalaliMonth {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function sameMonth(a: JalaliMonth, b: JalaliMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

/** The locale key of a month's name. */
export function monthKey(month: number): string {
  return JALALI_MONTH_KEYS[month - 1];
}

/** `?m=1405-08` ⇄ a month. */
export function monthParam({ year, month }: JalaliMonth): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseMonthParam(value: string | null | undefined): JalaliMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const month = { year: Number(match[1]), month: Number(match[2]) };
  return month.month >= 1 && month.month <= 12 ? month : null;
}
