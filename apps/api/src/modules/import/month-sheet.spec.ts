import { text } from '../../i18n';
import { accountKind, convertMonthSheet, SheetRow } from './month-sheet';

const DOCTORS = text.seed.doctors;
const IMPLANT = text.import.categoryWords.implant[0];
const BRUSH = text.import.categoryWords.toothbrush[0];
const DEPOSIT = text.import.categoryWords.deposit[0];

let line = 1;
function row(
  name: string,
  balance: number,
  paid: number,
  extra: Partial<SheetRow> = {},
): SheetRow {
  line += 1;
  return {
    line,
    name,
    service: '',
    balance,
    paid,
    date: '2026-10-23',
    account: '',
    notes: '',
    ...extra,
  };
}

describe('convertMonthSheet', () => {
  beforeEach(() => (line = 1));

  it('recovers each cost from the running balance', () => {
    const plan = convertMonthSheet(
      [
        row('Test A', 2230, 1000, { account: 'Card One' }), // cost 3230, paid 1000
        row('Test A', 2500, 0, { date: '2026-10-25' }), // a further 270
        row('Test A', 1000, 1500, { date: '2026-10-27' }), // a payment only
      ],
      DOCTORS,
    );
    const [patient] = plan.patients;
    expect(
      patient.entries.map((e) => [e.amount, e.payments.map((p) => p.amount)]),
    ).toEqual([
      [3230, [1000, 1500]],
      [270, []],
    ]);
    expect(plan.issues).toEqual([]);
  });

  it('keeps an implant on a balance of its own', () => {
    const plan = convertMonthSheet(
      [
        row('Test B', 300, 400), // treatment 700, 300 left
        row('Test B', 0, 600, { service: IMPLANT }), // implant 600, settled
        row('Test B', 0, 300), // settles the treatment
      ],
      DOCTORS,
    );
    const entries = plan.patients[0].entries;
    expect(
      entries.map((e) => [e.category, e.amount, e.payments.length]),
    ).toEqual([
      ['treatment', 700, 2],
      ['implant', 600, 1],
    ]);
  });

  it('reads the doctor from the notes, or from a swapped account cell', () => {
    const [emami, tajik] = [DOCTORS[1], DOCTORS[3]];
    const plan = convertMonthSheet(
      [
        row('Test C', 0, 160, { account: 'Card Two', notes: emami }),
        row('Test D', 0, 140, { account: tajik, notes: 'Card Three' }),
      ],
      DOCTORS,
    );
    expect(
      plan.patients.map((p) => [
        p.entries[0].doctor,
        p.entries[0].payments[0].account,
      ]),
    ).toEqual([
      [emami, 'Card Two'],
      [tajik, 'Card Three'],
    ]);
    expect(plan.accounts.map((a) => a.title)).toEqual([
      'Card Two',
      'Card Three',
    ]);
  });

  it('sells a product on the spot and books a deposit as credit', () => {
    const plan = convertMonthSheet(
      [
        row('Test E', 500, 0), // owes 500
        row('Test E', 0, 23, { service: BRUSH }), // a toothbrush, paid — the debt is untouched
        row('Test F', 0, 200, { service: DEPOSIT }),
      ],
      DOCTORS,
    );
    const [e, f] = plan.patients;
    expect(e.entries.map((x) => [x.category, x.amount])).toEqual([
      ['treatment', 500],
      ['toothbrush', 23],
    ]);
    expect(
      f.entries.map((x) => [x.category, x.amount, x.payments[0].amount]),
    ).toEqual([['deposit', 0, 200]]);
  });

  it('carries on from the balance the app already holds', () => {
    const opening = new Map([
      [
        'test g',
        { general: 900, implant: 0, lastEntry: { general: 'existing-entry' } },
      ],
    ]);
    const plan = convertMonthSheet([row('Test G', 400, 500)], DOCTORS, opening);
    const [g] = plan.patients;
    expect(g.entries).toEqual([]);
    expect(g.existing.get('existing-entry')?.map((p) => p.amount)).toEqual([
      500,
    ]);
  });

  it('flags a balance that drops more than the payment explains', () => {
    const plan = convertMonthSheet(
      [row('Test H', 1000, 0), row('Test H', 600, 100)],
      DOCTORS,
    );
    expect(plan.issues).toEqual([
      { line: 3, patient: 'Test H', code: 'balance_drop', amount: 300 },
    ]);
    expect(plan.patients[0].entries[0].amount).toBe(700);
  });
});

describe('accountKind', () => {
  it('tells the card terminal and banks from people', () => {
    expect(accountKind('pos')).toBe('pos');
    expect(accountKind(`${text.import.bankWords[1]} X`)).toBe('bank');
    expect(accountKind('Someone')).toBe('person');
  });
});
