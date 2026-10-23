# CLAUDE.md

Short list of things that go wrong if you don't know them. The README explains
the product; ops/README.md the deployment.

## Real patient data — read first

The old spreadsheet and any database here hold a real practice's patient names
and money.

- Never paste patient rows into commits, issues, PRs, logs or external services.
- `*.xlsx`, `*.db`, `backend/data/` and `.env` files are gitignored; keep them that way.
- Tests and demos use fake names only (`python -m app.cli seed-demo` fills an empty DB).

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
cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy app && .venv/bin/pytest
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

## Frontend conventions

- RTL everywhere: use logical utilities (`ps-`, `me-`, `start-`, `text-start`), not left/right.
- Colours only through the tokens in `src/styles.css` (`bg-surface`, `text-ink-2`, `text-debt` …) so both themes hold.
- The CSP forbids inline scripts; anything that must run before React lives in `public/`.
- In this Chromium, `window.scrollTo` returns a Promise — never use it as an effect's expression body.
