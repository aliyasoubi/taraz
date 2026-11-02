import type { MonthRange } from '../../common/jalali';
import type { AccountKind } from '../catalog/account.entity';
import type { Category } from '../ledger/categories';

/** The ledger as the report reads it: plain rows, everything up to the month's end. */
export interface LedgerInput {
  patients: { id: string; name: string; phone: string | null }[];
  doctors: { id: string; name: string }[];
  accounts: { id: string; title: string; kind: AccountKind }[];
  entries: {
    id: string;
    patientId: string;
    date: string;
    category: Category;
    doctorId: string | null;
    amount: number;
    description: string | null;
    createdAt: number;
  }[];
  payments: {
    id: string;
    entryId: string;
    date: string;
    amount: number;
    payerName: string | null;
    source: string | null;
    accountId: string | null;
    createdAt: number;
  }[];
}

/** One line of the month sheet: an entry's cost or a payment, with the balance after it. */
export interface MonthRow {
  kind: 'entry' | 'payment';
  id: string;
  entryId: string;
  date: string;
  patientId: string;
  patientName: string;
  category: Category;
  doctorName: string | null;
  description: string | null;
  charged: number;
  paid: number;
  payerName: string | null;
  source: string | null;
  accountTitle: string | null;
  /** The patient's whole balance once this row is counted. */
  balanceAfter: number;
}

export interface PatientMonth {
  patientId: string;
  name: string;
  phone: string | null;
  /** Owed on the eve of the month. */
  opening: number;
  charged: number;
  paid: number;
  /** Owed at the month's end. */
  closing: number;
  lastPaymentOn: string | null;
}

export interface MonthReport {
  month: MonthRange;
  totals: {
    charged: number;
    paid: number;
    /** Sum of every patient's balance on the eve of the month (credits net off). */
    opening: number;
    closing: number;
    /** What debtors owe at the month's end — credits not netted off. */
    debt: number;
    /** What the practice holds in deposits at the month's end. */
    credit: number;
    debtors: number;
    creditors: number;
    patientsSeen: number;
    entries: number;
    payments: number;
  };
  byAccount: {
    accountId: string | null;
    title: string | null;
    kind: AccountKind | null;
    amount: number;
    count: number;
  }[];
  byDoctor: {
    doctorId: string | null;
    name: string | null;
    charged: number;
    paid: number;
    entries: number;
  }[];
  byCategory: {
    category: Category;
    charged: number;
    paid: number;
    entries: number;
  }[];
  /** Everyone seen this month or still owing / owed at its end; largest debt first. */
  patients: PatientMonth[];
  rows: MonthRow[];
}

function bump<K>(map: Map<K, number>, key: K, by: number): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

export function buildMonthReport(
  month: MonthRange,
  input: LedgerInput,
): MonthReport {
  const inMonth = (date: string) => date >= month.start && date <= month.end;
  const before = (date: string) => date < month.start;
  const upToEnd = (date: string) => date <= month.end;

  const patientById = new Map(input.patients.map((p) => [p.id, p]));
  const doctorById = new Map(input.doctors.map((d) => [d.id, d]));
  const accountById = new Map(input.accounts.map((a) => [a.id, a]));
  const entryById = new Map(input.entries.map((e) => [e.id, e]));

  const opening = new Map<string, number>();
  const charged = new Map<string, number>();
  const paid = new Map<string, number>();
  const lastPayment = new Map<string, string>();

  for (const e of input.entries) {
    if (before(e.date)) bump(opening, e.patientId, e.amount);
    else if (inMonth(e.date)) bump(charged, e.patientId, e.amount);
  }
  for (const p of input.payments) {
    const entry = entryById.get(p.entryId);
    if (!entry || !upToEnd(p.date)) continue;
    if (before(p.date)) bump(opening, entry.patientId, -p.amount);
    else bump(paid, entry.patientId, p.amount);
    const last = lastPayment.get(entry.patientId);
    if (!last || p.date > last) lastPayment.set(entry.patientId, p.date);
  }

  // The month sheet: costs and payments in date order, each with the balance after it.
  type Pending = {
    row: Omit<MonthRow, 'balanceAfter'>;
    createdAt: number;
    order: number;
  };
  const pending: Pending[] = [];
  for (const e of input.entries) {
    if (!inMonth(e.date)) continue;
    pending.push({
      createdAt: e.createdAt,
      order: 0,
      row: {
        kind: 'entry',
        id: e.id,
        entryId: e.id,
        date: e.date,
        patientId: e.patientId,
        patientName: patientById.get(e.patientId)?.name ?? '',
        category: e.category,
        doctorName: (e.doctorId && doctorById.get(e.doctorId)?.name) || null,
        description: e.description,
        charged: e.amount,
        paid: 0,
        payerName: null,
        source: null,
        accountTitle: null,
      },
    });
  }
  for (const p of input.payments) {
    const e = entryById.get(p.entryId);
    if (!e || !inMonth(p.date)) continue;
    pending.push({
      createdAt: p.createdAt,
      order: 1,
      row: {
        kind: 'payment',
        id: p.id,
        entryId: e.id,
        date: p.date,
        patientId: e.patientId,
        patientName: patientById.get(e.patientId)?.name ?? '',
        category: e.category,
        doctorName: (e.doctorId && doctorById.get(e.doctorId)?.name) || null,
        description: e.description,
        charged: 0,
        paid: p.amount,
        payerName: p.payerName,
        source: p.source,
        accountTitle:
          (p.accountId && accountById.get(p.accountId)?.title) || null,
      },
    });
  }
  pending.sort(
    (a, b) =>
      a.row.date.localeCompare(b.row.date) ||
      a.createdAt - b.createdAt ||
      a.order - b.order,
  );
  const running = new Map(opening);
  const rows: MonthRow[] = pending.map(({ row }) => {
    bump(running, row.patientId, row.charged - row.paid);
    return { ...row, balanceAfter: running.get(row.patientId) ?? 0 };
  });

  const ids = new Set([...opening.keys(), ...charged.keys(), ...paid.keys()]);
  const patients: PatientMonth[] = [];
  for (const id of ids) {
    const o = opening.get(id) ?? 0;
    const c = charged.get(id) ?? 0;
    const pd = paid.get(id) ?? 0;
    const closing = o + c - pd;
    const seen = charged.has(id) || paid.has(id);
    if (!seen && closing === 0) continue;
    const patient = patientById.get(id);
    patients.push({
      patientId: id,
      name: patient?.name ?? '',
      phone: patient?.phone ?? null,
      opening: o,
      charged: c,
      paid: pd,
      closing,
      lastPaymentOn: lastPayment.get(id) ?? null,
    });
  }
  patients.sort(
    (a, b) => b.closing - a.closing || a.name.localeCompare(b.name, 'fa'),
  );

  const byAccount = new Map<string | null, { amount: number; count: number }>();
  const byDoctor = new Map<
    string | null,
    { charged: number; paid: number; entries: number }
  >();
  const byCategory = new Map<
    Category,
    { charged: number; paid: number; entries: number }
  >();
  const doctorSlot = (id: string | null) => {
    let slot = byDoctor.get(id);
    if (!slot) byDoctor.set(id, (slot = { charged: 0, paid: 0, entries: 0 }));
    return slot;
  };
  const categorySlot = (category: Category) => {
    let slot = byCategory.get(category);
    if (!slot)
      byCategory.set(category, (slot = { charged: 0, paid: 0, entries: 0 }));
    return slot;
  };
  for (const row of rows) {
    const entry = entryById.get(row.entryId)!;
    if (row.kind === 'entry') {
      doctorSlot(entry.doctorId).charged += row.charged;
      doctorSlot(entry.doctorId).entries += 1;
      categorySlot(row.category).charged += row.charged;
      categorySlot(row.category).entries += 1;
    } else {
      doctorSlot(entry.doctorId).paid += row.paid;
      categorySlot(row.category).paid += row.paid;
    }
  }
  for (const p of input.payments) {
    if (!inMonth(p.date) || !entryById.has(p.entryId)) continue;
    const slot = byAccount.get(p.accountId) ?? { amount: 0, count: 0 };
    slot.amount += p.amount;
    slot.count += 1;
    byAccount.set(p.accountId, slot);
  }

  const sum = (values: Iterable<number>) =>
    [...values].reduce((a, b) => a + b, 0);
  const closings = patients.map((p) => p.closing);
  return {
    month,
    totals: {
      charged: sum(charged.values()),
      paid: sum(paid.values()),
      opening: sum(opening.values()),
      closing: sum(closings),
      debt: sum(closings.filter((c) => c > 0)),
      credit: -sum(closings.filter((c) => c < 0)),
      debtors: closings.filter((c) => c > 0).length,
      creditors: closings.filter((c) => c < 0).length,
      patientsSeen: new Set(rows.map((r) => r.patientId)).size,
      entries: rows.filter((r) => r.kind === 'entry').length,
      payments: rows.filter((r) => r.kind === 'payment').length,
    },
    byAccount: [...byAccount.entries()]
      .map(([accountId, slot]) => {
        const account = accountId ? accountById.get(accountId) : undefined;
        return {
          accountId,
          title: account?.title ?? null,
          kind: account?.kind ?? null,
          ...slot,
        };
      })
      .sort((a, b) => b.amount - a.amount),
    byDoctor: [...byDoctor.entries()]
      .map(([doctorId, slot]) => ({
        doctorId,
        name: (doctorId && doctorById.get(doctorId)?.name) || null,
        ...slot,
      }))
      .sort((a, b) => b.charged + b.paid - (a.charged + a.paid)),
    byCategory: [...byCategory.entries()]
      .map(([category, slot]) => ({ category, ...slot }))
      .sort((a, b) => b.charged + b.paid - (a.charged + a.paid)),
    patients,
    rows,
  };
}
