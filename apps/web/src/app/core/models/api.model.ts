/** Wire types mirroring the API. Amounts are integer rials; dates are Gregorian `yyyy-MM-dd`. */

export type Category =
  'treatment' | 'implant' | 'deposit' | 'toothbrush' | 'toothpaste' | 'floss' | 'waterjet';

export type AccountKind = 'bank' | 'pos' | 'cash' | 'person';

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
}

export interface Doctor {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface Account {
  id: string;
  title: string;
  holder: string | null;
  bank: string | null;
  kind: AccountKind;
  active: boolean;
  sortOrder: number;
}

export interface PatientSummary {
  id: string;
  name: string;
  phone: string | null;
  charged: number;
  paid: number;
  /** Positive: owes. Negative: in credit. */
  balance: number;
  /** Paid as deposits and not yet applied to a treatment. */
  deposits: number;
  lastActivity: string | null;
}

export interface PatientPage {
  items: PatientSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface Payment {
  id: string;
  entryId: string;
  date: string;
  amount: number;
  payerName: string | null;
  source: string | null;
  account: { id: string; title: string } | null;
  note: string | null;
}

export interface Entry {
  id: string;
  patientId: string;
  date: string;
  category: Category;
  doctor: { id: string; name: string } | null;
  amount: number;
  description: string | null;
  paid: number;
  remaining: number;
  payments: Payment[];
}

export interface PatientDetail extends PatientSummary {
  note: string | null;
  createdAt: string;
  entries: Entry[];
}

export interface PaymentInput {
  date: string;
  amount: number;
  payerName?: string | null;
  source?: string | null;
  accountId?: string | null;
  note?: string | null;
}

export interface EntryInput {
  patientId?: string;
  patientName?: string;
  patientPhone?: string | null;
  date: string;
  category: Category;
  doctorId?: string | null;
  amount: number;
  description?: string | null;
  payments?: PaymentInput[];
  /** Put the patient's deposits toward what is left on the entry. */
  applyDeposits?: boolean;
}

export interface JalaliMonth {
  year: number;
  month: number;
}

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
  balanceAfter: number;
}

export interface PatientMonth {
  patientId: string;
  name: string;
  phone: string | null;
  opening: number;
  charged: number;
  paid: number;
  closing: number;
  lastPaymentOn: string | null;
}

export interface MonthReport {
  month: JalaliMonth & { start: string; end: string };
  totals: {
    charged: number;
    paid: number;
    opening: number;
    closing: number;
    debt: number;
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
  byCategory: { category: Category; charged: number; paid: number; entries: number }[];
  patients: PatientMonth[];
  rows: MonthRow[];
}

export interface ApiError {
  statusCode: number;
  code: string;
  params: Record<string, string | number>;
  fieldErrors?: Record<string, { code: string }[]>;
}
