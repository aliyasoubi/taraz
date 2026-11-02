/**
 * A number in words — `260000000` → «دویست و شصت میلیون». Shown under every
 * amount field, so a slipped zero (the sheet's `150,000,00`) reads as plainly
 * wrong before it is saved.
 *
 * The words themselves are the locale file's `numberWords`; this only puts
 * them in order.
 */
export interface NumberWords {
  // Keyed by digit (the locale file holds objects, not arrays); a zero has no word.
  ones: Record<string, string>;
  teens: Record<string, string>;
  tens: Record<string, string>;
  hundreds: Record<string, string>;
  /** By power of a thousand: 1 thousand, 2 million, 3 billion, … */
  scales: Record<string, string>;
  and: string;
  zero: string;
}

function belowThousand(n: number, w: NumberWords): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(w.hundreds[h]);
  if (rest >= 10 && rest < 20) parts.push(w.teens[rest - 10]);
  else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    if (t) parts.push(w.tens[t]);
    if (o) parts.push(w.ones[o]);
  }
  return parts.join(w.and);
}

export function persianWords(value: number, w: NumberWords): string {
  if (!Number.isFinite(value)) return '';
  const n = Math.floor(Math.abs(value));
  if (n === 0) return w.zero;
  const groups: number[] = [];
  for (let rest = n; rest > 0; rest = Math.floor(rest / 1000)) groups.push(rest % 1000);
  if (groups.length > Object.keys(w.scales).length + 1) return '';
  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (!groups[i]) continue;
    // "thousand", not "one thousand".
    const lead = i === 1 && groups[i] === 1 ? '' : belowThousand(groups[i], w);
    words.push([lead, w.scales[i]].filter(Boolean).join(' '));
  }
  return words.join(w.and);
}
