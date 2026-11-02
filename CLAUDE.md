# CLAUDE.md

The short list of things that go wrong if you don't know them. The README
explains the product.

## Real patient data — read first

The practice's workbook and the `taraz` database hold real patient names and money.

- Never paste patient rows into commits, issues, PRs, logs or external services.
- `*.xlsx`, `*.numbers`, `data/` and `.env` are gitignored; keep them that way.
- Tests, demos and screenshots use fake names only (`npm run seed:demo` on `taraz_demo`).

## Databases

Postgres 17 via Homebrew, role `dental`. **Pass `DB_NAME` explicitly** for
anything that writes; `.env` points at the real one.

| Database     | Holds                                                        |
| ------------ | ------------------------------------------------------------ |
| `taraz`      | Real records                                                 |
| `taraz_demo` | Fake patients; the `api-demo` launch config uses it          |
| `taraz_e2e`  | Throwaway; `test:e2e` truncates it and skips any other name  |

## Language

Code, comments, tests, commits and docs are English. Every user-facing string
lives in a locale file:

- `apps/web/public/i18n/fa.json` — the UI, via `| translate`. `npm run i18n:check`
  rejects Persian letters in `.ts`/`.html` and arrays in the dictionary.
- `apps/api/src/i18n/fa.json` — Excel export labels, the words the importer
  matches in the sheet, seed and demo data (`text` from `src/i18n`).

API errors leave as codes (`InvalidInputError('patient_required')`, validation
→ `fieldErrors`); the web app owns the wording under `errors.<code>`.

## Ledger rules

- Amounts are integer **rials** (`bigint`, read back through `bigintToNumber`).
- A patient's balance = Σ entry costs − Σ payments. Never stored. The SQL
  definition is `BALANCES_CTE` (patients.service); the month report rebuilds it
  in `buildMonthReport`, a pure function with its tests — change both together.
- Payments always belong to an entry. A deposit is an entry with cost 0;
  applying it (`ledger/deposits.ts`) moves its payments onto the treatment, so
  a payment can be dated before its entry.
- Dates are stored as Gregorian `date` (`yyyy-MM-dd`, kept as strings — see the
  `pg` type parser in `data-source.ts`); everything shown is Jalali. Month
  boundaries come from `common/jalali.ts` (API) and `shared/lib/jalali.ts` (web).

## Schema changes

Add a migration under `apps/api/src/database/migrations/` (hand-written SQL,
`synchronize` is off). New columns are nullable or have a default.

## Frontend

- Compose the `tz-*` primitives in `apps/web/src/app/shared/ui` (taken from
  patient-book's `pb-*`); colours only through the M3 / `--tz-*` tokens in
  `styles.scss`, so both themes hold. Ledger tables share `styles/_ledger.scss`.
- RTL everywhere: logical properties (`inline-start`, `margin-inline`), not left/right.
- A new Material Symbol needs `npm run icons:build --workspace=web` (fonttools).

## Before you push

```bash
npm run lint && npm test && npm run build && npm run i18n:check
```
