import 'reflect-metadata';
import ExcelJS from 'exceljs';
import { resolve } from 'node:path';

import {
  monthOf,
  monthRange,
  parseJalali,
  toJalali,
} from '../../common/jalali';
import { searchKey, toLatinDigits } from '../../common/persian-text';
import dataSource from '../../database/data-source';
import { text } from '../../i18n';
import { Account } from '../catalog/account.entity';
import { Doctor } from '../catalog/doctor.entity';
import { isProduct } from '../ledger/categories';
import { Entry } from '../ledger/entry.entity';
import { Payment } from '../ledger/payment.entity';
import { Patient } from '../patients/patient.entity';
import {
  convertMonthSheet,
  ImportPlan,
  Opening,
  SheetRow,
} from './month-sheet';

/**
 * Imports one month sheet of the practice's workbook (.xlsx — Numbers can
 * export one: File → Export To → Excel).
 *
 *   npm run import -- workbook.xlsx                 preview: what would be added
 *   npm run import -- workbook.xlsx --apply         write it
 *   npm run import -- workbook.xlsx --sheet "…"     a sheet other than the first
 *
 * Patients already in the app are matched by name and continue from the
 * balance they have; a month that already has rows is refused unless --force.
 */

const FIELDS = [
  'name',
  'service',
  'balance',
  'payment',
  'date',
  'account',
  'notes',
] as const;
type Field = (typeof FIELDS)[number];
const DEFAULT_COLUMNS: Record<Field, number> = {
  name: 0,
  service: 1,
  balance: 2,
  payment: 3,
  date: 4,
  account: 5,
  notes: 6,
};

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('result' in value) return cellText(value.result);
    if ('richText' in value) return value.richText.map((r) => r.text).join('');
    if ('text' in value) return String(value.text);
    return '';
  }
  return String(value).trim();
}

function amount(value: ExcelJS.CellValue): number | null {
  if (typeof value === 'number') return Math.round(value);
  const digits = toLatinDigits(cellText(value)).replace(/[,٬\s]/g, '');
  return /^-?\d+$/.test(digits) ? Number(digits) : null;
}

function columns(header: string[]): Record<Field, number> {
  const found: Partial<Record<Field, number>> = {};
  header.forEach((cell, index) => {
    const key = searchKey(cell);
    for (const field of FIELDS) {
      const names = text.import.headers[field];
      if (
        found[field] === undefined &&
        names.some((n) => searchKey(n) === key)
      ) {
        found[field] = index;
      }
    }
  });
  return { ...DEFAULT_COLUMNS, ...found };
}

function readSheet(ws: ExcelJS.Worksheet): SheetRow[] {
  const values = (n: number) => {
    const row = ws.getRow(n).values as ExcelJS.CellValue[];
    return row.slice(1); // exceljs rows are 1-based
  };
  const cols = columns(values(1).map(cellText));
  const rows: SheetRow[] = [];
  for (let n = 2; n <= ws.rowCount; n++) {
    const cells = values(n);
    const get = (field: Field) => cells[cols[field]];
    const name = cellText(get('name'));
    if (!name) continue;
    const dateText = cellText(get('date'));
    rows.push({
      line: n,
      name,
      service: cellText(get('service')),
      balance: amount(get('balance')),
      paid: amount(get('payment')),
      date:
        /^\d{4}-\d{2}-\d{2}$/.test(dateText) && dateText.startsWith('20')
          ? dateText
          : parseJalali(dateText),
      account: cellText(get('account')),
      notes: cellText(get('notes')),
    });
  }
  return rows;
}

async function openings(): Promise<Map<string, Opening>> {
  const rows: {
    name_key: string;
    category: Entry['category'];
    entry_id: string;
    amount: string;
    paid: string;
  }[] = await dataSource.query(
    `SELECT p.name_key, e.category, e.id AS entry_id, e.amount,
            COALESCE((SELECT SUM(x.amount) FROM payments x WHERE x.entry_id = e.id), 0) AS paid
     FROM entries e JOIN patients p ON p.id = e.patient_id
     ORDER BY e.date, e.created_at`,
  );
  const result = new Map<string, Opening>();
  for (const r of rows) {
    if (isProduct(r.category)) continue;
    const track = r.category === 'implant' ? 'implant' : 'general';
    const o = result.get(r.name_key) ?? {
      general: 0,
      implant: 0,
      lastEntry: {},
    };
    o[track] += Number(r.amount) - Number(r.paid);
    o.lastEntry[track] = r.entry_id;
    result.set(r.name_key, o);
  }
  return result;
}

function money(n: number): string {
  return n.toLocaleString('en-US');
}

function summarize(plan: ImportPlan, existingKeys: Set<string>): void {
  const entries = plan.patients.flatMap((p) => p.entries);
  const payments = [
    ...entries.flatMap((e) => e.payments),
    ...plan.patients.flatMap((p) => [...p.existing.values()].flat()),
  ];
  const fresh = plan.patients.filter((p) => !existingKeys.has(p.key)).length;
  console.log(
    `Patients: ${plan.patients.length} (${fresh} new, ${plan.patients.length - fresh} already in the app)`,
  );
  console.log(
    `Entries:  ${entries.length}, costs ${money(entries.reduce((s, e) => s + e.amount, 0))} rials`,
  );
  console.log(
    `Payments: ${payments.length}, paid ${money(payments.reduce((s, p) => s + p.amount, 0))} rials`,
  );
  console.log(
    `Accounts: ${plan.accounts.map((a) => `${a.title} (${a.kind})`).join(', ') || '—'}`,
  );
  console.log(
    `Doctors found on ${entries.filter((e) => e.doctor).length} entries.`,
  );
  if (plan.issues.length) {
    console.log(`\nTo check (${plan.issues.length}):`);
    for (const i of plan.issues) {
      console.log(
        `  row ${i.line}  ${i.patient}  ${i.code}${i.amount ? `  ${money(i.amount)}` : ''}`,
      );
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const file = args.find(
    (a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--sheet',
  );
  if (!file)
    throw new Error(
      'Usage: npm run import -- workbook.xlsx [--sheet NAME] [--apply] [--force]',
    );
  const sheetName = args.includes('--sheet')
    ? args[args.indexOf('--sheet') + 1]
    : undefined;
  const apply = args.includes('--apply');
  const force = args.includes('--force');

  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(
    resolve(process.env.INIT_CWD ?? process.cwd(), file),
  );
  const ws = sheetName ? book.getWorksheet(sheetName) : book.worksheets[0];
  if (!ws) throw new Error(`No sheet named "${sheetName}"`);
  const rows = readSheet(ws);
  const dated = rows
    .map((r) => r.date)
    .filter((d): d is string => !!d)
    .sort();
  if (!dated.length) throw new Error('No dated rows on this sheet');
  const month = monthRange(monthOf(dated[Math.floor(dated.length / 2)]));
  console.log(
    `Sheet "${ws.name}": ${rows.length} rows, ${toJalali(month.start).slice(0, 7)}\n`,
  );

  await dataSource.initialize();
  try {
    const doctors = await dataSource.getRepository(Doctor).find();
    const existing = await dataSource.getRepository(Patient).find();
    const byKey = new Map<string, Patient>();
    for (const p of existing)
      if (!byKey.has(p.nameKey)) byKey.set(p.nameKey, p);
    const plan = convertMonthSheet(
      rows,
      doctors.map((d) => d.name),
      await openings(),
    );
    summarize(plan, new Set(byKey.keys()));

    if (!apply) {
      console.log('\nPreview only — run again with --apply to write it.');
      return;
    }
    const [{ count }]: { count: string }[] = await dataSource.query(
      `SELECT (SELECT COUNT(*) FROM entries WHERE date BETWEEN $1 AND $2)
            + (SELECT COUNT(*) FROM payments WHERE date BETWEEN $1 AND $2) AS count`,
      [month.start, month.end],
    );
    if (Number(count) > 0 && !force) {
      throw new Error(
        `This month already has ${count} rows in the app; importing it again would count it twice. Use --force to import anyway.`,
      );
    }

    await dataSource.transaction(async (m) => {
      const accountIds = new Map<string, string>();
      for (const a of await m.find(Account))
        accountIds.set(searchKey(a.title), a.id);
      for (const a of plan.accounts) {
        if (!accountIds.has(searchKey(a.title))) {
          const saved = await m.save(
            m.create(Account, { title: a.title, kind: a.kind }),
          );
          accountIds.set(searchKey(a.title), saved.id);
        }
      }
      const doctorIds = new Map(doctors.map((d) => [d.name, d.id]));
      const toPayment = (
        entryId: string,
        p: ImportPlan['patients'][number]['entries'][number]['payments'][number],
      ) =>
        m.create(Payment, {
          entryId,
          date: p.date,
          amount: p.amount,
          accountId: p.account
            ? (accountIds.get(searchKey(p.account)) ?? null)
            : null,
          note: p.note,
        });

      for (const planned of plan.patients) {
        let patient = byKey.get(planned.key);
        if (!patient) {
          patient = await m.save(
            m.create(Patient, { name: planned.name, nameKey: planned.key }),
          );
        }
        for (const e of planned.entries) {
          const entry = await m.save(
            m.create(Entry, {
              patientId: patient.id,
              date: e.date,
              category: e.category,
              doctorId: e.doctor ? (doctorIds.get(e.doctor) ?? null) : null,
              amount: e.amount,
            }),
          );
          for (const p of e.payments)
            if (p.amount > 0) await m.save(toPayment(entry.id, p));
        }
        for (const [entryId, payments] of planned.existing) {
          for (const p of payments)
            if (p.amount > 0) await m.save(toPayment(entryId, p));
        }
      }
    });
    console.log('\nImported.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error('Import failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
