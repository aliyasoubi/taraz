import { fromIsoDay, jalaliDay, monthOf, parseMonthParam, shiftMonth, toIsoDay } from './jalali';

describe('jalali', () => {
  it('converts between the API day and the Jalali reading of it', () => {
    expect(jalaliDay('2026-10-23')).toBe('۱۴۰۵/۰۸/۰۱');
    expect(toIsoDay(fromIsoDay('2026-11-21'))).toBe('2026-11-21');
    expect(monthOf(fromIsoDay('2026-11-21'))).toEqual({ year: 1405, month: 8 });
  });

  it('steps across the new year', () => {
    expect(shiftMonth({ year: 1405, month: 1 }, -1)).toEqual({ year: 1404, month: 12 });
    expect(shiftMonth({ year: 1404, month: 12 }, 1)).toEqual({ year: 1405, month: 1 });
  });

  it('reads the month from the address bar', () => {
    expect(parseMonthParam('1405-08')).toEqual({ year: 1405, month: 8 });
    expect(parseMonthParam('1405-13')).toBeNull();
    expect(parseMonthParam(undefined)).toBeNull();
  });
});
