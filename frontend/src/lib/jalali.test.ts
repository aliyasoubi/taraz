import { describe, expect, it } from 'vitest'
import { faDigits } from './format'
import { addDays, formatJ, isoToJ, jToIso, monthLength, MONTHS, shiftMonth, weekdayIndex } from './jalali'

describe('jalali', () => {
  it('converts both ways', () => {
    expect(isoToJ('2026-10-23')).toEqual({ jy: 1405, jm: 8, jd: 1 })
    expect(jToIso({ jy: 1405, jm: 7, jd: 1 })).toBe('2026-09-23')
  })

  it('formats with Persian digits and month names', () => {
    expect(formatJ('2026-10-23')).toBe(`${faDigits(1)} ${MONTHS[7]} ${faDigits(1405)}`)
    expect(formatJ('2026-10-23', 'numeric')).toBe(faDigits('1405/08/01'))
  })

  it('knows month lengths and wraps years', () => {
    expect(monthLength(1405, 1)).toBe(31)
    expect(monthLength(1405, 7)).toBe(30)
    expect(shiftMonth(1405, 12, 1)).toEqual({ jy: 1406, jm: 1 })
    expect(shiftMonth(1405, 1, -1)).toEqual({ jy: 1404, jm: 12 })
  })

  it('starts the week on Saturday', () => {
    expect(weekdayIndex('2026-10-24')).toBe(0) // Saturday
    expect(addDays('2026-10-23', 1)).toBe('2026-10-24')
  })
})
