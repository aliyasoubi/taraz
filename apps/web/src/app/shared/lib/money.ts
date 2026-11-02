/**
 * Amounts are integer rials end to end — the sheet the practice keeps is in
 * rials, so the app reads and writes the same numbers.
 */

const PERSIAN_DIGIT_BASE = 0x06f0;
/** ARABIC THOUSANDS SEPARATOR, what Persian typography groups digits with. */
const GROUP = '٬';

export function persianDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => String.fromCharCode(PERSIAN_DIGIT_BASE + Number(d)));
}

/** `260000000` → `۲۶۰٬۰۰۰٬۰۰۰`. Negative amounts keep their sign. */
export function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  const grouped = Math.abs(Math.round(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
  return sign + persianDigits(grouped);
}

/** Digits typed in any script, separators and spaces ignored → rials, or null. */
export function parseMoney(text: string | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  const latin = text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\s,٬،._]/g, '');
  if (!latin) return null;
  if (!/^\d+$/.test(latin)) return NaN;
  return Number(latin);
}

/** What the field shows while typing: the digits grouped as they come. */
export function groupDigits(text: string): string {
  const value = parseMoney(text);
  if (value === null || Number.isNaN(value)) return text;
  return formatMoney(value);
}

export interface CompactParts {
  /** Persian digits, at most one decimal. */
  value: string;
  /** `money.million` etc., or null when the number is small enough to show whole. */
  unitKey: string | null;
}

const SCALES: [number, string][] = [
  [1e12, 'money.trillion'],
  [1e9, 'money.billion'],
  [1e6, 'money.million'],
];

/** `27905000000` → `{ value: '۲۷٫۹', unitKey: 'money.billion' }` — for tiles, not ledgers. */
export function compactMoney(value: number): CompactParts {
  const abs = Math.abs(value);
  for (const [scale, unitKey] of SCALES) {
    if (abs >= scale) {
      const scaled = Math.round((value / scale) * 10) / 10;
      const text = scaled.toString().replace('.', '٫');
      return { value: persianDigits(text), unitKey };
    }
  }
  return { value: formatMoney(value), unitKey: null };
}
