# Taraz — تراز

حساب مالی بیماران مطب دندانپزشکی: هزینه هر درمان، پرداخت‌ها (چه کسی، از کجا، به کدام حساب)، پزشک معالج، و گزارش ماهانه پرداختی‌ها، مانده بدهی و بیماران بدهکار.

A web app that replaces the practice's «حسابرسی - پذیرش» workbook. Every row of
the sheet — a patient, what the cost was for, what was paid, by whom, into which
account, and the treating doctor — becomes an entry in the app, and the month's
numbers are worked out from them instead of typed by hand.

**Stack:** NestJS 11 · TypeORM · PostgreSQL 17 · Angular 22 · Angular Material 22 (Material 3) —
the same stack and design system as patient-book.

## What it does

- **One form per visit** (ثبت جدید): pick the patient or type a new name, choose
  what the cost was for — dental treatment, implant, a deposit, or a product
  (toothbrush, toothpaste, floss, water jet) — the treating doctor, the date and
  the cost, then whatever was paid there and then.
- **Payments are recorded like transfers**: the amount and date, who paid (empty
  means the patient), from where (their bank or card), and into which of the
  practice's accounts. An entry can collect several payments over time.
- **A deposit** carries no cost; its payment leaves the patient in credit until
  the treatment is entered. Then it is applied to that treatment — from the
  form, or later from the patient's page — and its payments move onto it, so
  the treatment shows what is really left and the money counts toward its
  category and doctor. No new money is recorded; the balance does not change.
- **Monthly monitoring** (پایش ماهانه) on the Jalali calendar: the month's costs,
  payments, outstanding debt and number of debtors; the month sheet with each
  patient's balance after every row; receipts per account and per category; each
  doctor's work and collections; the debtors at the month's end; and an Excel
  export in the sheet's own layout.
- **Patients** with a live balance (owes / in credit / settled), searchable by
  name or phone; **debtors** today, largest first, with a tap-to-call number.
- **Settings**: the doctors (seeded with Dr. Nourbakhsh, Dr. Emami, Dr. Bolourian
  and Dr. Tajik), the destination accounts, light/dark theme, password.
- Amount fields group digits as you type (Persian or Latin) and spell the amount
  out in words, so a slipped zero is caught before it is saved.

Amounts are integer **rials**, as in the workbook. Balances are never stored —
they are always summed from the entries and payments.

## Running locally

Requires Node 22 and PostgreSQL 17.

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `JWT_SECRET` (`openssl rand -base64 48`) and `SEED_ADMIN_PASSWORD` in
`.env`, then create the database, the schema, the first sign-in and the four
doctors:

```bash
createdb -h localhost -U dental taraz
```

```bash
npm run migration:run && npm run seed
```

```bash
npm run dev
```

| Service | URL                              |
| ------- | -------------------------------- |
| Web app | http://localhost:4400            |
| API     | http://localhost:3400/api        |
| Health  | http://localhost:3400/api/health |

Sign in as `SEED_ADMIN_USERNAME` (default `admin`) with `SEED_ADMIN_PASSWORD`.

### A demo database

Fake patients with two months of entries, for trying the app — never real names:

```bash
createdb -h localhost -U dental taraz_demo
```

```bash
DB_NAME=taraz_demo SEED_ADMIN_PASSWORD=demo-pass-1234 npm run migration:run
```

```bash
DB_NAME=taraz_demo SEED_ADMIN_PASSWORD=demo-pass-1234 npm run seed && DB_NAME=taraz_demo npm run seed:demo
```

`.claude/launch.json` starts the API on this database (`api-demo`) beside the web app.

## Importing the workbook

The importer reads one month sheet from an `.xlsx`. Numbers can write one:
**File → Export To → Excel**. Keep the file outside the repository (or in
`data/`, which is gitignored).

```bash
npm run import -- ~/Desktop/workbook.xlsx
```

That is a preview: patients, entries, payments, the accounts it will create, and
any rows to check. When it looks right:

```bash
npm run import -- ~/Desktop/workbook.xlsx --apply
```

How a row is read: the sheet never states the cost, only the balance *after*
the row («مانده حساب») and the payment («پرداختی»). Each patient's rows are
replayed against a running balance, so the cost of a row is
`balance after + paid − balance before`. Implant rows keep a balance of their
own, product sales stand alone, and a deposit is credit. The doctor is read from
the notes column («توضیحات») — or from the account column when the two were
swapped — and every account name becomes a destination account. Names spelled
two ways (a trailing space, آ/ا, ي/ی) are one patient.

A patient's first row in the first imported month carries whatever they owed
before it, so that month's costs include older debts. A later month continues
from the balances already in the app; importing a month that already has rows is
refused unless `--force` is passed. Rows where the balance falls further than the
payment explains are listed under "To check" and lower the latest cost.

## Layout

```
apps/api      NestJS: auth, catalog (doctors, accounts), patients, ledger
              (entries + payments), reports (month report, Excel), import (CLI)
apps/web      Angular: month, patients, patient, debtors, entry form, settings
ops           Deploying on the VPS beside patient-book: Docker Compose (app +
              Postgres), deploy, backup and restore scripts
```

## Deploying

One image: the API serves the built web app (`WEB_DIST`), next to Postgres in
the same Compose project, behind patient-book's Caddy. The steps, backups and
updates are in [ops/README.md](ops/README.md).

## Checks

```bash
npm run lint && npm test && npm run build && npm run i18n:check
```

```bash
createdb -h localhost -U dental taraz_e2e
```

```bash
DB_NAME=taraz_e2e npm run migration:run && DB_NAME=taraz_e2e npm run test:e2e
```
