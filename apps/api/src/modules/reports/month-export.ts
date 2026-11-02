import ExcelJS from 'exceljs';

import { toJalali } from '../../common/jalali';
import { fill, text } from '../../i18n';
import type { MonthReport } from './month-report';

const MONEY = '#,##0';
const t = text.export;

function categoryLabel(category: keyof typeof text.categories): string {
  return text.categories[category];
}

function sheet(
  book: ExcelJS.Workbook,
  name: string,
  columns: [string, number][],
) {
  const ws = book.addWorksheet(name, {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });
  ws.columns = columns.map(([header, width]) => ({ header, width }));
  ws.getRow(1).font = { bold: true };
  return ws;
}

/**
 * The month as a workbook: the rows in the practice's own sheet layout, each
 * patient's balance in and out, the debtors, and the totals.
 */
export async function monthWorkbook(report: MonthReport): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  const c = t.columns;
  const monthName = `${text.months[report.month.month - 1]} ${report.month.year}`;

  const rows = sheet(book, t.sheets.rows, [
    [c.index, 6],
    [c.date, 12],
    [c.patient, 24],
    [c.category, 18],
    [c.description, 24],
    [c.doctor, 16],
    [c.charged, 16],
    [c.paid, 16],
    [c.balance, 16],
    [c.payer, 18],
    [c.source, 18],
    [c.account, 20],
  ]);
  report.rows.forEach((row, i) => {
    rows.addRow([
      i + 1,
      toJalali(row.date),
      row.patientName,
      categoryLabel(row.category),
      row.description ?? '',
      row.doctorName ?? '',
      row.charged || null,
      row.paid || null,
      row.balanceAfter,
      row.kind === 'payment' ? (row.payerName ?? t.patientIsPayer) : '',
      row.source ?? '',
      row.kind === 'payment' ? (row.accountTitle ?? t.noAccount) : '',
    ]);
  });
  for (const key of [7, 8, 9]) rows.getColumn(key).numFmt = MONEY;

  const patients = sheet(book, t.sheets.patients, [
    [c.patient, 24],
    [c.phone, 14],
    [c.opening, 18],
    [c.charged, 16],
    [c.paid, 16],
    [c.closing, 18],
    [c.lastPayment, 14],
  ]);
  for (const p of report.patients) {
    patients.addRow([
      p.name,
      p.phone ?? '',
      p.opening,
      p.charged,
      p.paid,
      p.closing,
      p.lastPaymentOn ? toJalali(p.lastPaymentOn) : '',
    ]);
  }
  for (const key of [3, 4, 5, 6]) patients.getColumn(key).numFmt = MONEY;

  const debtors = sheet(book, t.sheets.debtors, [
    [c.index, 6],
    [c.patient, 24],
    [c.phone, 14],
    [c.debt, 18],
    [c.lastPayment, 14],
  ]);
  report.patients
    .filter((p) => p.closing > 0)
    .forEach((p, i) => {
      debtors.addRow([
        i + 1,
        p.name,
        p.phone ?? '',
        p.closing,
        p.lastPaymentOn ? toJalali(p.lastPaymentOn) : '',
      ]);
    });
  debtors.getColumn(4).numFmt = MONEY;

  const s = t.summary;
  const summary = book.addWorksheet(t.sheets.summary, {
    views: [{ rightToLeft: true }],
  });
  summary.columns = [
    { width: 28 },
    { width: 20 },
    { width: 20 },
    { width: 12 },
  ];
  summary.addRow([fill(s.title, { month: monthName })]).font = {
    bold: true,
    size: 14,
  };
  summary.addRow([]);
  const totals = report.totals;
  for (const [label, value] of [
    [s.opening, totals.opening],
    [s.charged, totals.charged],
    [s.paid, totals.paid],
    [s.closing, totals.closing],
    [s.debt, totals.debt],
    [s.credit, totals.credit],
  ] as const) {
    summary.addRow([label, value]).getCell(2).numFmt = MONEY;
  }
  summary.addRow([s.debtors, totals.debtors]);
  summary.addRow([s.patientsSeen, totals.patientsSeen]);

  summary.addRow([]);
  summary.addRow([s.byAccount, c.amount, '', c.count]).font = { bold: true };
  for (const a of report.byAccount) {
    summary
      .addRow([a.title ?? t.noAccount, a.amount, '', a.count])
      .getCell(2).numFmt = MONEY;
  }
  summary.addRow([]);
  summary.addRow([s.byDoctor, c.charged, c.paid, c.entries]).font = {
    bold: true,
  };
  for (const d of report.byDoctor) {
    const row = summary.addRow([
      d.name ?? t.noDoctor,
      d.charged,
      d.paid,
      d.entries,
    ]);
    row.getCell(2).numFmt = MONEY;
    row.getCell(3).numFmt = MONEY;
  }
  summary.addRow([]);
  summary.addRow([s.byCategory, c.charged, c.paid, c.entries]).font = {
    bold: true,
  };
  for (const k of report.byCategory) {
    const row = summary.addRow([
      categoryLabel(k.category),
      k.charged,
      k.paid,
      k.entries,
    ]);
    row.getCell(2).numFmt = MONEY;
    row.getCell(3).numFmt = MONEY;
  }

  return Buffer.from(await book.xlsx.writeBuffer());
}
