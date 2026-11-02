import { normalizeForDisplay, searchKey } from '../../common/persian-text';
import { text } from '../../i18n';
import type { AccountKind } from '../catalog/account.entity';
import { type Category, isProduct } from '../ledger/categories';

/**
 * One month sheet of the practice's workbook → the entries and payments the
 * app keeps.
 *
 * A row of the sheet is one visit: the patient, what it was for («شرح»), the
 * balance *after* the row («مانده حساب»), what was paid («پرداختی»), the date,
 * the account it went to («بانک - حساب») and notes — where the doctor is
 * usually written. The sheet never states the cost; it is recovered from the
 * balance: each patient's rows are replayed against a running balance, and
 *
 *   cost of the row = balance after + paid − balance before.
 *
 * Implant rows keep a balance of their own (the sheet treats an implant plan
 * as a separate account), product sales stand alone, and a deposit's balance
 * cell is ignored — a deposit is credit, not a cost.
 */

export interface SheetRow {
  line: number;
  name: string;
  service: string;
  balance: number | null;
  paid: number | null;
  /** Gregorian `yyyy-MM-dd`, already parsed from the Jalali cell; null when unreadable. */
  date: string | null;
  account: string;
  notes: string;
}

type Track = 'general' | 'implant';

export interface PlannedPayment {
  line: number;
  date: string;
  amount: number;
  account: string | null;
  note: string | null;
}

export interface PlannedEntry {
  line: number;
  date: string;
  category: Category;
  doctor: string | null;
  amount: number;
  payments: PlannedPayment[];
}

export interface PlannedPatient {
  key: string;
  name: string;
  entries: PlannedEntry[];
  /** Payments against entries already in the app (`entryId` → payments). */
  existing: Map<string, PlannedPayment[]>;
}

export type IssueCode =
  'no_date' | 'balance_drop' | 'no_entry_for_payment' | 'unknown_amount';

export interface Issue {
  line: number;
  patient: string;
  code: IssueCode;
  amount?: number;
}

export interface ImportPlan {
  patients: PlannedPatient[];
  accounts: { title: string; kind: AccountKind }[];
  issues: Issue[];
}

/** What the app already knows about a patient, so a later month carries on from it. */
export interface Opening {
  general: number;
  implant: number;
  /** The latest entry of each track, for payments that settle an older cost. */
  lastEntry: Partial<Record<Track, string>>;
}

const words = text.import;
const fold = (s: string) => searchKey(s).replace(/\s+/g, ' ');
const doctorWord = fold(words.doctorPrefix);

function categoryOf(service: string): Category {
  const s = fold(service);
  if (!s) return 'treatment';
  for (const [category, list] of Object.entries(words.categoryWords)) {
    if (list.some((w) => s.includes(fold(w)))) return category as Category;
  }
  return 'treatment';
}

/** A whole word of the title, so «ملی» never matches inside a given name. */
function hasWord(title: string, list: readonly string[]): boolean {
  const tokens = fold(title).split(/[\s-]+/);
  return list.some((w) => tokens.includes(fold(w)));
}

export function accountKind(title: string): AccountKind {
  if (hasWord(title, words.posWords)) return 'pos';
  if (hasWord(title, words.cashWords)) return 'cash';
  if (hasWord(title, words.bankWords)) return 'bank';
  return 'person';
}

/** A doctor's surname, folded: «دکتر امامی» → «امامی». */
function surname(name: string): string {
  return fold(name)
    .replace(new RegExp(`^${doctorWord}\\s*`), '')
    .trim();
}

export function convertMonthSheet(
  rows: SheetRow[],
  doctors: readonly string[],
  opening: ReadonlyMap<string, Opening> = new Map(),
): ImportPlan {
  const doctorBySurname = new Map(doctors.map((d) => [surname(d), d]));
  const asDoctor = (cell: string): string | null => {
    const s = surname(cell);
    return s ? (doctorBySurname.get(s) ?? null) : null;
  };

  const patients = new Map<string, PlannedPatient>();
  const balances = new Map<string, Record<Track, number>>();
  const accounts = new Map<string, { title: string; kind: AccountKind }>();
  const issues: Issue[] = [];
  let lastDate: string | null = null;

  for (const row of rows) {
    const name = normalizeForDisplay(row.name);
    if (!name) continue;
    const key = searchKey(name);
    let date = row.date;
    if (!date) {
      if (!lastDate) continue;
      date = lastDate;
      issues.push({ line: row.line, patient: name, code: 'no_date' });
    }
    lastDate = date;

    let patient = patients.get(key);
    if (!patient) {
      patient = { key, name, entries: [], existing: new Map() };
      patients.set(key, patient);
    }
    const known = opening.get(key);
    let balance = balances.get(key);
    if (!balance) {
      balance = { general: known?.general ?? 0, implant: known?.implant ?? 0 };
      balances.set(key, balance);
    }

    // The doctor is written in the notes, or now and then in the account cell
    // with the account moved to the notes.
    let accountCell = normalizeForDisplay(row.account);
    let notes = normalizeForDisplay(row.notes);
    let doctor = asDoctor(notes);
    if (doctor) notes = '';
    else if (asDoctor(accountCell)) {
      doctor = asDoctor(accountCell);
      accountCell = notes;
      notes = '';
    }
    const account = accountCell || null;
    if (account && !accounts.has(fold(account))) {
      accounts.set(fold(account), {
        title: account,
        kind: accountKind(account),
      });
    }
    const accountTitle = account ? accounts.get(fold(account))!.title : null;

    const category = categoryOf(row.service);
    const paid = row.paid ?? 0;
    const pay = (): PlannedPayment => ({
      line: row.line,
      date: date,
      amount: paid,
      account: accountTitle,
      note: notes || null,
    });
    const newEntry = (amount: number): PlannedEntry => {
      const entry: PlannedEntry = {
        line: row.line,
        date: date,
        category,
        doctor,
        amount,
        payments: paid > 0 ? [pay()] : [],
      };
      patient.entries.push(entry);
      return entry;
    };

    if (isProduct(category)) {
      newEntry(paid + (row.balance ?? 0));
      continue;
    }
    if (category === 'deposit') {
      if (paid > 0) newEntry(0);
      balance.general -= paid;
      continue;
    }
    if (row.balance === null && row.paid === null) {
      issues.push({ line: row.line, patient: name, code: 'unknown_amount' });
      continue;
    }

    const track: Track = category === 'implant' ? 'implant' : 'general';
    const before = balance[track];
    const after = row.balance ?? before - paid;
    const cost = after + paid - before;

    if (cost > 0) {
      newEntry(cost);
    } else {
      if (cost < 0) {
        // The sheet's balance fell further than the payment explains: the cost
        // was lowered. Take it off the latest cost of this track, if one is here.
        issues.push({
          line: row.line,
          patient: name,
          code: 'balance_drop',
          amount: -cost,
        });
        const last = latest(patient.entries, track);
        if (last && last.amount >= -cost) last.amount += cost;
      }
      if (paid > 0) {
        const target =
          openEntry(patient.entries, track) ?? latest(patient.entries, track);
        if (target) target.payments.push(pay());
        else if (known?.lastEntry[track]) {
          const id = known.lastEntry[track];
          patient.existing.set(id, [
            ...(patient.existing.get(id) ?? []),
            pay(),
          ]);
        } else {
          issues.push({
            line: row.line,
            patient: name,
            code: 'no_entry_for_payment',
            amount: paid,
          });
          newEntry(0);
        }
      }
    }
    balance[track] = after;
  }

  return {
    patients: [...patients.values()],
    accounts: [...accounts.values()],
    issues,
  };
}

function inTrack(entry: PlannedEntry, track: Track): boolean {
  return track === 'implant'
    ? entry.category === 'implant'
    : entry.category !== 'implant' && !isProduct(entry.category);
}

function latest(
  entries: PlannedEntry[],
  track: Track,
): PlannedEntry | undefined {
  return entries.filter((e) => inTrack(e, track)).at(-1);
}

/** The oldest entry of the track that still has something owing on it. */
function openEntry(
  entries: PlannedEntry[],
  track: Track,
): PlannedEntry | undefined {
  return entries.find(
    (e) =>
      inTrack(e, track) &&
      e.amount - e.payments.reduce((s, p) => s + p.amount, 0) > 0,
  );
}
