import { compactMoney, formatMoney, groupDigits, parseMoney } from './money';
import fa from '../../../../public/i18n/fa.json';
import { persianWords } from './persian-words';

describe('money', () => {
  it('groups rials with Persian digits', () => {
    expect(formatMoney(260000000)).toBe('۲۶۰٬۰۰۰٬۰۰۰');
    expect(formatMoney(-1500)).toBe('-۱٬۵۰۰');
    expect(formatMoney(0)).toBe('۰');
  });

  it('reads what was typed in any digits, ignoring separators', () => {
    expect(parseMoney('۲۶۰٬۰۰۰٬۰۰۰')).toBe(260000000);
    expect(parseMoney('150,000,00')).toBe(15000000);
    expect(parseMoney(' ')).toBeNull();
    expect(parseMoney('12a')).toBeNaN();
    expect(groupDigits('1500000')).toBe('۱٬۵۰۰٬۰۰۰');
  });

  it('shortens large totals for tiles', () => {
    expect(compactMoney(27905000000)).toEqual({ value: '۲۷٫۹', unitKey: 'money.billion' });
    expect(compactMoney(260000000)).toEqual({ value: '۲۶۰', unitKey: 'money.million' });
    expect(compactMoney(50000)).toEqual({ value: '۵۰٬۰۰۰', unitKey: null });
  });
});

describe('persianWords', () => {
  it('spells amounts the way they are said', () => {
    expect(persianWords(260000000, fa.numberWords)).toBe('دویست و شصت میلیون');
    expect(persianWords(1480000000, fa.numberWords)).toBe('یک میلیارد و چهارصد و هشتاد میلیون');
    expect(persianWords(1000, fa.numberWords)).toBe('هزار');
    expect(persianWords(12500, fa.numberWords)).toBe('دوازده هزار و پانصد');
    expect(persianWords(0, fa.numberWords)).toBe('صفر');
  });
});
