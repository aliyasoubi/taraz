# CLAUDE.md

Short list of things that go wrong if you don't know them. The README explains
the product; ops/README.md the deployment.

## Real patient data — read first

The old spreadsheet and any database here hold a real practice's patient names
and money.

- Never paste patient rows into commits, issues, PRs, logs or external services.
- `*.xlsx`, `*.db`, `backend/data/` and `.env` files are gitignored; keep them that way.
- Tests and demos use fake names only (`python -m app.cli seed-demo` fills an empty DB).

## Language

Code, comments, tests, commits and docs are English. Every user-facing string
lives in a locale file:

- `frontend/src/locales/fa.json` — UI text, used as `t('section.key', { vars })`
  from `src/lib/i18n.ts` (keys are type-checked). Enum labels come from
  `src/lib/labels.ts`, which reads the same file.
- `backend/app/i18n/fa.json` — Excel export labels, the words the importer
  matches, demo data; used as `t("export.sheets.summary")` from `app.i18n`.

API errors are English codes (`raise HTTPException(404, "patient_not_found")`)
with a matching `errors.<code>` entry in the frontend locale file.
`./scripts/check-no-persian.sh` (CI) rejects Persian anywhere else. Where
Persian characters are data, not text (folding tables, test fixtures), write
them as `\uXXXX` escapes.

## Ledger rules

- Amounts are integer **rials**. Toman is display-only (`frontend/src/lib/format.ts`).
- Balances are never stored. `backend/app/services/ledger.py` is the single
  definition (`signed_amount`, `counts_as_paid`, `effective_on`); reports and
  lists build on it. Don't recompute balances ad hoc elsewhere.
- A cheque payment counts only when `cheque_status == cleared`, and lands on its
  due date. Pending/bounced cheques never reduce a balance.
- Dates are stored Gregorian; everything shown is Jalali. Month boundaries come
  from `JMonth` (backend) / `lib/jalali.ts` (frontend).

## Schema changes

Edit `app/models.py`, then from `backend/`:

```bash
.venv/bin/alembic revision --autogenerate -m "what changed"
```

Tests run the real migrations, so a model change without a migration fails CI.

## Before you push

```bash
./scripts/check-no-persian.sh
cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy app && .venv/bin/pytest
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

## Frontend conventions

- RTL everywhere: use logical utilities (`ps-`, `me-`, `start-`, `text-start`), not left/right.
- Colours only through the tokens in `src/styles.css` (`bg-surface`, `text-ink-2`, `text-debt` …) so both themes hold.
- The CSP forbids inline scripts; anything that must run before React lives in `public/`.
- In this Chromium, `window.scrollTo` returns a Promise — never use it as an effect's expression body.
