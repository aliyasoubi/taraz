import {
  monthOf,
  monthRange,
  parseJalali,
  previousMonth,
  toJalali,
} from './jalali';

describe('jalali', () => {
  it('maps a Jalali month onto its Gregorian days', () => {
    expect(monthRange({ year: 1405, month: 8 })).toEqual({
      year: 1405,
      month: 8,
      start: '2026-10-23',
      end: '2026-11-21',
    });
    // Esfand of a common year has 29 days.
    expect(monthRange({ year: 1404, month: 12 }).end).toBe('2026-03-20');
  });

  it('round-trips a date through both calendars', () => {
    expect(toJalali('2026-10-23')).toBe('1405/08/01');
    expect(parseJalali('1405-08-01')).toBe('2026-10-23');
    expect(parseJalali('۱۴۰۵/۸/۱')).toBe('2026-10-23');
    expect(monthOf('2026-11-21')).toEqual({ year: 1405, month: 8 });
  });

  it('rejects days that do not exist', () => {
    expect(parseJalali('1405-07-31')).toBeNull();
    expect(parseJalali('1405-13-01')).toBeNull();
    expect(parseJalali('not a date')).toBeNull();
  });

  it('steps back across the new year', () => {
    expect(previousMonth({ year: 1405, month: 1 })).toEqual({
      year: 1404,
      month: 12,
    });
  });
});
