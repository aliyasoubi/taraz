import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { InvalidInputError } from '../../common/errors';
import {
  isValidMonth,
  JalaliMonth,
  monthOf,
  monthRange,
} from '../../common/jalali';
import type { Category } from '../ledger/categories';
import { buildMonthReport, LedgerInput, MonthReport } from './month-report';

interface EntryRow {
  id: string;
  patient_id: string;
  date: string;
  category: Category;
  doctor_id: string | null;
  amount: string;
  description: string | null;
  created_at: Date;
}

interface PaymentRow {
  id: string;
  entry_id: string;
  date: string;
  amount: string;
  payer_name: string | null;
  source: string | null;
  account_id: string | null;
  created_at: Date;
}

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /**
   * One Jalali month: its sheet of rows, receipts per account and doctor, and
   * every patient's balance carried in and out of it.
   */
  async month(month: JalaliMonth): Promise<MonthReport> {
    if (!isValidMonth(month.year, month.month))
      throw new InvalidInputError('invalid_month');
    const range = monthRange(month);
    return buildMonthReport(range, await this.ledgerUpTo(range.end));
  }

  /** Every Jalali month that has an entry or a payment, newest first. */
  async months(): Promise<JalaliMonth[]> {
    const rows: { day: string }[] = await this.db.query(
      `SELECT date AS day FROM entries UNION SELECT date FROM payments`,
    );
    const seen = new Map<string, JalaliMonth>();
    for (const { day } of rows) {
      const m = monthOf(day);
      seen.set(`${m.year}-${m.month}`, m);
    }
    return [...seen.values()].sort(
      (a, b) => b.year - a.year || b.month - a.month,
    );
  }

  private async ledgerUpTo(end: string): Promise<LedgerInput> {
    const [patients, doctors, accounts, entries, payments] = await Promise.all([
      this.db.query<LedgerInput['patients']>(
        `SELECT id, name, phone FROM patients`,
      ),
      this.db.query<LedgerInput['doctors']>(`SELECT id, name FROM doctors`),
      this.db.query<LedgerInput['accounts']>(
        `SELECT id, title, kind FROM accounts`,
      ),
      this.db.query<EntryRow[]>(
        `SELECT id, patient_id, date, category, doctor_id, amount, description, created_at
         FROM entries WHERE date <= $1`,
        [end],
      ),
      this.db.query<PaymentRow[]>(
        `SELECT p.id, p.entry_id, p.date, p.amount, p.payer_name, p.source, p.account_id, p.created_at
         FROM payments p WHERE p.date <= $1`,
        [end],
      ),
    ]);
    return {
      patients,
      doctors,
      accounts,
      entries: entries.map((e) => ({
        id: e.id,
        patientId: e.patient_id,
        date: e.date,
        category: e.category,
        doctorId: e.doctor_id,
        amount: Number(e.amount),
        description: e.description,
        createdAt: new Date(e.created_at).getTime(),
      })),
      payments: payments.map((p) => ({
        id: p.id,
        entryId: p.entry_id,
        date: p.date,
        amount: Number(p.amount),
        payerName: p.payer_name,
        source: p.source,
        accountId: p.account_id,
        createdAt: new Date(p.created_at).getTime(),
      })),
    };
  }
}
