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
  (`frontend/src/lib/i18n.ts`).
- `backend/app/i18n/fa.json` — text the backend writes into Excel exports, the
  words the importer matches in the old workbook, and the demo data.

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
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

```bash
./scripts/check-no-persian.sh
```

GitHub Actions (`.github/workflows/ci.yml`) runs all of these on every push, and
builds the Docker image.

## Importing balances from the old workbook

The debtors sheet can be imported once as opening balances. Each row becomes a
charge noted as carried over from Excel; cheque rows also create a pending
cheque for the same amount and due date. Rows ending in `imp` / ortho go to the
patient's implant / orthodontics case.

```bash
.venv/bin/python -m app.cli import-debtors /path/to/workbook.xlsx --as-of 1405-08-01 --dry-run
.venv/bin/python -m app.cli import-debtors /path/to/workbook.xlsx --as-of 1405-08-01
```

Run it with `--dry-run` first. When a patient has both a plain balance row and
cheque rows, the row numbers are printed for review: the workbook does not say
whether the cheques cover that balance or come on top of it. On the server:

```bash
docker compose cp /path/to/workbook.xlsx taraz:/tmp/old.xlsx
docker compose exec taraz python -m app.cli import-debtors /tmp/old.xlsx --as-of 1405-08-01 --dry-run
```

## Deployment

See [ops/README.md](ops/README.md). In short: on the VPS that runs patient-book,
clone into `/opt/taraz`, fill in `.env`, run `docker compose up -d --build`, and
add a site block to patient-book's Caddy.

## Layout

```
backend/
  app/
    models.py        tables: patient, treatment case, destination account, transaction
    services/        balance arithmetic (ledger), monthly report, Excel export/import
    routers/         API: auth, patients, transactions, accounts, reports
    i18n/            backend locale file (fa.json)
    cli.py           hash-password, backup, import-debtors, seed-demo
  alembic/           database migrations
  tests/
frontend/
  src/
    pages/           home, patients, patient ledger, accounts, reports, cheques, settings
    components/      sheets, transaction form, receipt, amount input, Jalali calendar …
    lib/             API client, rial/toman formatting, Jalali dates, i18n
    locales/         fa.json — every UI string
ops/                 deploy.sh, backup.sh, systemd timer, Caddy site block
scripts/             check-no-persian.sh
```
