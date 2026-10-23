import { describe, expect, it } from 'vitest'
import { digitsOnly, faDigits, formatCompact, formatMoney, fromUnit, toWords } from '@/shared/lib/format'
import { messages } from '@/shared/lib/i18n'
import { fold, initials } from '@/shared/lib/text'

const { ones, teens, tens, hundreds, scales, and } = messages.numbers
const GROUP = '\u066C' // Arabic thousands separator, as Intl fa-IR prints it
const DECIMAL = '\u066B'

describe('amounts', () => {
  it('spells out amounts so a dropped zero is visible', () => {
    // 1,700,000,000 → "one billion and seven hundred million"
    expect(toWords(1_700_000_000)).toBe(`${ones[1]} ${scales[3]}${and}${hundreds[7]} ${scales[2]}`)
    // the old sheet's "150,000,00" is fifteen million, not a hundred and fifty
    expect(toWords(150_000_00)).toBe(`${teens[5]} ${scales[2]}`)
    // 2,512 → "two thousand and five hundred and twelve"
    expect(toWords(2_512)).toBe(`${ones[2]} ${scales[1]}${and}${hundreds[5]}${and}${teens[2]}`)
    expect(toWords(40)).toBe(tens[4])
    expect(toWords(0)).toBe('')
  })

  it('reads Persian and Arabic-Indic digits', () => {
    expect(digitsOnly(faDigits('150') + GROUP + faDigits('000'))).toBe('150000')
    expect(digitsOnly('\u0662\u0665\u0660')).toBe('250') // Arabic-Indic 250
  })

  it('converts between rial and toman', () => {
    expect(fromUnit(17_000_000, 'toman')).toBe(170_000_000)
    expect(formatMoney(170_000_000, 'toman')).toBe([17, '000', '000'].map(faDigits).join(GROUP))
    expect(formatMoney(-500, 'rial', { sign: true })).toBe(`−${faDigits(500)}`)
    expect(formatCompact(1_250_000_000, 'rial')).toBe(
      `${faDigits(1)}${DECIMAL}${faDigits(3)} ${messages.compact.billion}`,
    )
  })
})

describe('names', () => {
  it('folds Arabic letter variants and ZWNJ for search', () => {
    // Arabic yeh/kaf vs Persian yeh/keheh
    expect(fold('\u0643\u064A\u0627\u0646')).toBe(fold('\u06A9\u06CC\u0627\u0646'))
    // a half-space (ZWNJ) and a space spell the same name
    expect(fold('\u0646\u06CC\u06A9\u200C\u0646\u0627\u0645')).toBe(fold('\u0646\u06CC\u06A9 \u0646\u0627\u0645'))
  })

  it('ignores digits when making initials, and keeps the letters apart', () => {
    // "Kian Nik 2" → K + ZWNJ + N
    expect(initials(`\u06A9\u06CC\u0627\u0646 \u0646\u06CC\u06A9 ${faDigits(2)}`)).toBe('\u06A9\u200C\u0646')
  })
})
