import { monthRange } from '../../common/jalali';
import { buildMonthReport, LedgerInput } from './month-report';

// Aban 1405 runs 2026-10-23 .. 2026-11-21.
const ABAN = monthRange({ year: 1405, month: 8 });

function ledger(): LedgerInput {
  return {
    patients: [
      { id: 'p1', name: 'Test Patient A', phone: null },
      { id: 'p2', name: 'Test Patient B', phone: '09120000000' },
      { id: 'p3', name: 'Test Patient C', phone: null },
    ],
    doctors: [{ id: 'd1', name: 'Dr One' }],
    accounts: [{ id: 'a1', title: 'Card', kind: 'bank' }],
    entries: [
      // A: owed 500 from Mehr, a 300 treatment in Aban, paid 600 in Aban.
      e('e1', 'p1', '2026-10-10', 500),
      e('e2', 'p1', '2026-10-25', 300, 'd1'),
      // B: a deposit of 200 in Aban, nothing charged yet.
      { ...e('e3', 'p2', '2026-10-26', 0), category: 'deposit' },
      // C: an old debt, untouched this month.
      e('e4', 'p3', '2026-09-01', 1000),
      // Next month: not counted.
      e('e5', 'p1', '2026-11-25', 999),
    ],
    payments: [
      pay('x1', 'e2', '2026-10-25', 600, 'a1'),
      pay('x2', 'e3', '2026-10-26', 200, 'a1'),
      pay('x3', 'e4', '2026-09-02', 400, null),
    ],
  };
}

function e(
  id: string,
  patientId: string,
  date: string,
  amount: number,
  doctorId?: string,
) {
  return {
    id,
    patientId,
    date,
    category: 'treatment' as const,
    doctorId: doctorId ?? null,
    amount,
    description: null,
    createdAt: Date.parse(date),
  };
}

function pay(
  id: string,
  entryId: string,
  date: string,
  amount: number,
  accountId: string | null,
) {
  return {
    id,
    entryId,
    date,
    amount,
    payerName: null,
    source: null,
    accountId,
    createdAt: Date.parse(date) + 1,
  };
}

describe('buildMonthReport', () => {
  const report = buildMonthReport(ABAN, ledger());

  it('carries each balance across the month boundary', () => {
    const byId = Object.fromEntries(
      report.patients.map((p) => [p.patientId, p]),
    );
    expect(byId.p1).toMatchObject({
      opening: 500,
      charged: 300,
      paid: 600,
      closing: 200,
    });
    expect(byId.p2).toMatchObject({
      opening: 0,
      charged: 0,
      paid: 200,
      closing: -200,
    });
    expect(byId.p3).toMatchObject({
      opening: 600,
      charged: 0,
      paid: 0,
      closing: 600,
    });
  });

  it('lists the largest debt first and keeps debt and credit apart', () => {
    expect(report.patients.map((p) => p.patientId)).toEqual(['p3', 'p1', 'p2']);
    expect(report.totals).toMatchObject({
      charged: 300,
      paid: 800,
      opening: 1100,
      closing: 600,
      debt: 800,
      credit: 200,
      debtors: 2,
      creditors: 1,
      patientsSeen: 2,
    });
  });

  it('writes the month sheet with the running balance after each row', () => {
    expect(
      report.rows.map((r) => [r.id, r.charged, r.paid, r.balanceAfter]),
    ).toEqual([
      ['e2', 300, 0, 800],
      ['x1', 0, 600, 200],
      ['e3', 0, 0, 0],
      ['x2', 0, 200, -200],
    ]);
    expect(report.rows[1]).toMatchObject({
      accountTitle: 'Card',
      doctorName: 'Dr One',
    });
  });

  it('splits receipts by account and work by doctor', () => {
    expect(report.byAccount).toEqual([
      { accountId: 'a1', title: 'Card', kind: 'bank', amount: 800, count: 2 },
    ]);
    expect(report.byDoctor).toContainEqual({
      doctorId: 'd1',
      name: 'Dr One',
      charged: 300,
      paid: 600,
      entries: 1,
    });
  });
});
