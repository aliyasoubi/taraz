import { Pipe, PipeTransform } from '@angular/core';

import { formatMoney } from '../lib/money';
import { jalaliDay } from '../lib/jalali';

/** `260000000 | money` → `۲۶۰٬۰۰۰٬۰۰۰`. */
@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : formatMoney(value);
  }
}

/** `'2026-10-23' | jday` → `۱۴۰۵/۰۸/۰۱`. */
@Pipe({ name: 'jday', standalone: true })
export class JalaliDayPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return jalaliDay(value);
  }
}
