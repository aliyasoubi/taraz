import 'reflect-metadata';

import {
  currentMonth,
  isoDate,
  monthRange,
  previousMonth,
} from '../../common/jalali';
import { text } from '../../i18n';
import { Account } from '../../modules/catalog/account.entity';
import { Doctor } from '../../modules/catalog/doctor.entity';
import type { Category } from '../../modules/ledger/categories';
import { Entry } from '../../modules/ledger/entry.entity';
import { Payment } from '../../modules/ledger/payment.entity';
import { Patient } from '../../modules/patients/patient.entity';
import dataSource from '../data-source';

/**
 * Fake patients with two months of entries, for trying the app and for UI
 * checks — never real names. Refuses a database that already has patients.
 * Run `npm run seed` first: it uses the doctors and accounts that creates.
 */

// A small deterministic generator, so every demo database looks the same.
let state = 20261101;
function rand(): number {
  state = (state * 1103515245 + 12345) % 2147483648;
  return state / 2147483648;
}
const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)];
const million = (lo: number, hi: number) =>
  Math.round(lo + rand() * (hi - lo)) * 1_000_000;

function dayIn(start: string, end: string, upTo: Date): string {
  const from = new Date(start).getTime();
  const to = Math.min(new Date(end).getTime(), upTo.getTime());
  return isoDate(new Date(from + rand() * Math.max(0, to - from)));
}

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    const m = dataSource.manager;
    if ((await m.count(Patient)) > 0) {
      throw new Error(
        'This database already has patients; the demo only fills an empty one.',
      );
    }
    const doctors = await m.find(Doctor);
    if (!doctors.length) throw new Error('Run `npm run seed` first.');
    for (const a of text.demo.accounts) {
      if (!(await m.existsBy(Account, { title: a.title }))) {
        await m.save(
          m.create(Account, { ...a, kind: a.kind as Account['kind'] }),
        );
      }
    }
    const accounts = await m.find(Account);

    const now = new Date();
    const months = [previousMonth(currentMonth(now)), currentMonth(now)].map(
      monthRange,
    );
    const categories: Category[] = [
      'treatment',
      'treatment',
      'treatment',
      'implant',
      'deposit',
      'toothbrush',
      'waterjet',
    ];

    for (const name of text.demo.patients) {
      const patient = await m.save(
        m.create(Patient, {
          name,
          phone:
            rand() < 0.7
              ? `0912${String(Math.floor(rand() * 1e7)).padStart(7, '0')}`
              : null,
        }),
      );
      const visits = 1 + Math.floor(rand() * 3);
      for (let v = 0; v < visits; v++) {
        const month = months[rand() < 0.4 ? 0 : 1];
        const date = dayIn(month.start, month.end, now);
        const category = pick(categories);
        const cost =
          category === 'deposit'
            ? 0
            : category === 'implant'
              ? million(400, 1500)
              : category === 'treatment'
                ? million(20, 400)
                : million(1, 12);
        const entry = await m.save(
          m.create(Entry, {
            patientId: patient.id,
            date,
            category,
            doctorId:
              category === 'toothbrush' || category === 'waterjet'
                ? null
                : pick(doctors).id,
            amount: cost,
            description:
              category === 'treatment' ? pick(text.demo.descriptions) : null,
          }),
        );
        const share =
          category === 'deposit'
            ? 1
            : cost && rand() < 0.35
              ? 1
              : rand() < 0.15
                ? 0
                : 0.3 + rand() * 0.5;
        const paid =
          category === 'deposit'
            ? million(50, 300)
            : Math.round((cost * share) / 1_000_000) * 1_000_000;
        if (paid > 0) {
          await m.save(
            m.create(Payment, {
              entryId: entry.id,
              date,
              amount: paid,
              payerName: rand() < 0.25 ? pick(text.demo.payers) : null,
              source: rand() < 0.6 ? pick(text.demo.sources) : null,
              accountId: pick(accounts).id,
            }),
          );
        }
      }
    }
    console.log(`Added ${text.demo.patients.length} demo patients.`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error('Demo seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
