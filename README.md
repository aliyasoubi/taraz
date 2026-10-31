# Taraz — patient balance ledger

A single-user web app (PWA) for tracking what each patient owes, replacing the
practice's "accounting – admissions" Excel workbook. It is designed for the
iPhone: open it in Safari and use **Add to Home Screen** to install it as a
standalone app. The interface is in Persian (right-to-left, Jalali calendar).

## What it does

- **A ledger per patient** with a live balance — the spreadsheet's "balance"
  column, but computed instead of typed by hand.
- **Every payment is recorded like a bank transfer**: the *source* (who actually
  paid — the patient, or someone else, e.g. Mohammad paying for Ali's treatment)
  and the *destination* (which account received it — your own card, a card
  terminal, the cash box, or a third party such as Mr. Ghomi whom the patient was
  asked to pay directly).
- **Separate treatment cases** per patient (general, implant, orthodontics,
  laminate …), each with its own balance — what the spreadsheet's `imp` rows did.
- **Cheques**: a cheque does not reduce the debt until it clears. Due dates are
  listed on the Cheques screen; one tap marks a cheque cleared or bounced.
- **Month-end report** on the Jalali calendar: each patient's opening and closing
  balance, receipts per destination account and per payment method, cheques due
  that month, and an Excel export.
- **Destination accounts** drawn as bank cards, with this month's receipts.
- Discounts and refunds, a full Excel backup, rial/toman display, dark/light
  themes, and a "hide amounts" mode.
- The amount field spells the number out in words and has a "000" key, so
  typos like the spreadsheet's `150,000,00` are caught before saving.

## Stack

| Part      | Choice                                                                 | Why                                                    |
| --------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| Backend   | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2                | Typed API, versioned migrations, simple to test        |
| Database  | SQLite (WAL)                                                           | One user: a single file, backed up with one command    |
| Frontend  | React 19, TypeScript, Vite, Tailwind CSS 4, Motion, TanStack Query     | A light PWA with smooth animation on iPhone            |
| Calendar  | jalaali-js / jdatetime                                                 | All dates and reports are Jalali                       |
| Hosting   | One Docker container behind patient-book's Caddy                      | The data stays on your own server                      |

Amounts are always stored as integer **rials**. Balances are never stored; they
are always derived from the transactions, so they cannot drift from them.

## Language and text

The source code, comments, tests and docs are English. Every user-facing string
lives in a locale file:

- `frontend/src/locales/fa.json` — the app's UI, read through `t('section.key')`
  (`frontend/src/shared/lib/i18n.ts`).
- `backend/app/core/i18n/fa.json` — text the backend writes into Excel exports, the
  words the importer matches in the practice's workbook, and the demo data.

API errors are English codes (`patient_not_found`); the frontend translates them.
`scripts/check-no-persian.sh` (run in CI) fails if Persian text appears anywhere
else; characters that are data rather than text (letter-folding tables, test
fixtures) are written as `\uXXXX` escapes.

## Running locally

Requires Python 3.12 and Node 22.

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cp .env.example .env
.venv/bin/python -m app.cli hash-password
```

Put the printed `AUTH_PASSWORD_HASH='…'` line into `backend/.env`, then:

```bash
.venv/bin/alembic upgrade head
.venv/bin/python -m app.cli seed-demo
.venv/bin/uvicorn app.main:app --reload
```

```bash
cd frontend
npm install
npm run dev
```

The app opens on `http://localhost:5173` (Vite proxies `/api` to port 8000). To
try it on an iPhone on the same network, open `http://<your-mac-ip>:5173`.
`seed-demo` only creates fake data for trying the UI, and only on an empty database.

## Tests and code quality

```bash
cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy app && .venv/bin/pytest
```

```bash
cd frontend && npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

```bash
./scripts/check-no-persian.sh
```

GitHub Actions (`.github/workflows/ci.yml`) runs all of these on every push, and
builds the Docker image.

## Importing a month sheet

The app follows the practice's month sheet, one Jalali month at a time (Aban
1405, then Azar, …). A sheet has one row per visit or payment: patient,
service, balance after the row, payment, date, "bank - account", notes.
Columns are found by their headers, so a "payer" or "doctor" column added
later is read too. Only the chosen month's sheet is read; other sheets in the
file are ignored.

The sheet records only the balance after each row, so charges are rebuilt
from how a patient's balance moves. Each patient starts from what they owe in
the app at the start of the month, and from zero the first time. The service
column decides how a row is read:
- An item or visit fee (toothbrush, visit) is a charge paid on the spot.
- A deposit leaves the patient in credit.

**One step, on the server** (`-` reads the file from stdin):

```bash
docker compose exec -T taraz python -m app.cli import-month - --month 1405-09 --dry-run < azar.xlsx
docker compose exec -T taraz python -m app.cli import-month - --month 1405-09 < azar.xlsx
```

It refuses a month that already has entries, since importing it twice would
count it twice. `--replace` starts the whole ledger afresh from this month;
take a backup first. The output lists the rows worth a look.

**With a review step**, on your Mac: `convert-spreadsheet` writes the month as
a standard workbook to check and correct, and `import-workbook` loads it.

```bash
.venv/bin/python -m app.cli convert-spreadsheet practice.xlsx data/import/taraz-standard.xlsx --month 1405-08
.venv/bin/python -m app.cli import-workbook data/import/taraz-standard.xlsx --dry-run
```

`data/import/` is gitignored: the files hold real patient data. In the app,
the **month sheet** tab shows the same month back, row by row, with each
patient's balance after the row, and downloads it as Excel in the sheet's
layout.

### Reviewing the standard workbook

- **Transactions:** one row per charge, payment, discount or cheque. "Source"
  points to the sheet and row of the practice workbook. Rows needing a look are
  highlighted, with the reason in the last column. Type, case, method and
  cheque status are dropdowns.
- **Patients:** the name used, the other spellings found, and possible
  duplicates. To merge two patients, write the right name in "merge into".
- **Accounts:** canonical title, bank, owner and kind. Fix titles here and in
  the transactions that use them.
- **Issues:** everything ambiguous (unclear amounts and dates, balance drops
  without a payment, cheques), and what was
  done about each.

## Deployment

See [ops/README.md](ops/README.md). In short: on the VPS that runs patient-book,
clone into `/opt/taraz`, fill in `.env`, run `docker compose up -d --build`, and
add a one-line `import` to patient-book's Caddy, after which Taraz publishes and
reloads its own site (`taraz.dentixo.ir`) without restarting patient-book.

## Architecture

### Backend — layered

```
backend/app/
  main.py            composition root: builds the app from the parts below
  api/               HTTP only — thin routes, dependencies, error mapping, middleware, SPA serving
    routes/          one module per resource; parse input, call a service, return a schema
    deps.py          DbSession, SettingsDep, require_user (the only FastAPI ↔ core glue)
    errors.py        domain errors → 404 / 409 / 422
  services/          business logic and queries; know nothing about HTTP
    ledger.py        the single definition of a balance (signed amounts, cheque rules)
    patients.py  accounts.py  transactions.py  reports.py
    export.py  backup.py  demo.py
    spreadsheet/     practice workbook → standard workbook (cells, accounts, ledger rebuild)
    workbook/        standard workbook model, Excel writer/reader, database importer
  schemas/           Pydantic request/response models, one module per resource
  models.py          SQLAlchemy tables
  core/              config, database, security, domain errors, i18n (no FastAPI imports)
  utils/             Jalali calendar, Persian text folding, PATCH helper
  cli.py             admin commands; delegates to services
```

Dependencies point inwards: `api → services → models/core/utils`. Services raise
`NotFoundError` / `ConflictError` / `InvalidError` with an English code; only
`api/errors.py` knows the HTTP status for each.

### Frontend — by feature

```
frontend/src/
  main.tsx           entry: query client, router, toaster, service worker
  app/               shell: App (routes + auth gate), TabBar, global styles
  features/          one folder per domain; each owns its pages, components and data hooks
    auth/  dashboard/  patients/  accounts/  transactions/  reports/  settings/
      api.ts         TanStack Query hooks for that domain
      *Page.tsx      route screens, composed from components/
      components/    UI used by that feature
    patients/ledger.ts            running balance + month grouping (pure, tested)
    transactions/form/model.ts    transaction form state and rules (pure, tested)
    transactions/form/*Section    one component per form section
  shared/
    api/             fetch client, API types, query keys + cache invalidation
    lib/             formatting, Jalali dates, i18n, settings, labels, text folding
    ui/              design system: Button, Sheet, Money, AmountInput, DatePicker … (index.ts)
  locales/fa.json    every UI string
```

Features may use `shared/` and another feature's public `api.ts` or
components; `shared/` never imports from `features/`. Logic that can be a pure
function lives next to the feature in a `.ts` file with a test beside it.

### Other folders

```
ops/                 deploy.sh, backup.sh, systemd timer, Caddy site block
scripts/             check-no-persian.sh
.github/workflows/   CI (text, backend, frontend, image) and manual deploy
```
