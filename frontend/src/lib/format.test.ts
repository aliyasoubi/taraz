import { describe, expect, it } from 'vitest'
import { digitsOnly, formatCompact, formatMoney, fromUnit, toWords } from './format'
import { fold, initials } from './text'

describe('amounts', () => {
  it('spells out amounts so a dropped zero is visible', () => {
    expect(toWords(1_700_000_000)).toBe('یک میلیارد و هفتصد میلیون')
    expect(toWords(150_000_00)).toBe('پانزده میلیون')
    expect(toWords(2_512)).toBe('دو هزار و پانصد و دوازده')
    expect(toWords(0)).toBe('')
  })

  it('reads Persian and Arabic-Indic digits', () => {
    expect(digitsOnly('۱۵۰٬۰۰۰')).toBe('150000')
    expect(digitsOnly('٢٥٠')).toBe('250')
  })

  it('converts between rial and toman', () => {
    expect(fromUnit(17_000_000, 'toman')).toBe(170_000_000)
    expect(formatMoney(170_000_000, 'toman')).toBe('۱۷٬۰۰۰٬۰۰۰')
    expect(formatMoney(-500, 'rial', { sign: true })).toBe('−۵۰۰')
    expect(formatCompact(1_250_000_000, 'rial')).toBe('۱٫۳ میلیارد')
  })
})

describe('names', () => {
  it('folds Arabic letter variants and ZWNJ for search', () => {
    expect(fold('آرين كوهستاني')).toBe(fold('آرین کوهستانی'))
    expect(fold('آسمانی‌نژاد')).toBe('اسمانی نژاد')
  })

  it('ignores digits when making initials', () => {
    expect(initials('آرمان صبوری ۲')).toBe('آ\u200cص')
  })
})
