"""Admin commands.

python -m app.cli hash-password
python -m app.cli backup /data/backups [--keep 30]
python -m app.cli convert-spreadsheet practice.xlsx standard.xlsx [--month 1405-08]
python -m app.cli import-month practice.xlsx [--month 1405-09] [--dry-run] [--replace]   # or `-`
python -m app.cli import-workbook standard.xlsx [--dry-run] [--replace]   # or `-` for stdin
python -m app.cli seed-demo        # fake data, for trying the UI
"""

import argparse
import getpass
import sys
from io import BytesIO
from pathlib import Path

from app.core.config import get_settings
from app.core.db import new_session
from app.core.errors import ConflictError, InvalidError
from app.core.security import hash_password
from app.services.backup import backup_sqlite, sqlite_path
from app.services.demo import seed_demo
from app.services.spreadsheet.convert import convert_month
from app.services.spreadsheet.monthly import import_month
from app.services.transactions import count_transactions
from app.services.workbook.importer import import_book
from app.services.workbook.reader import read_book
from app.services.workbook.writer import write_book
from app.utils.jalali import JMonth


def cmd_hash_password(_: argparse.Namespace) -> int:
    password = getpass.getpass("New password: ")
    if len(password) < 10:
        print("Use at least 10 characters.", file=sys.stderr)
        return 1
    if getpass.getpass("Repeat: ") != password:
        print("Passwords do not match.", file=sys.stderr)
        return 1
    # Single quotes keep Docker Compose from interpolating the `$` in the hash.
    print(f"AUTH_PASSWORD_HASH='{hash_password(password)}'")
    return 0


def cmd_backup(args: argparse.Namespace) -> int:
    try:
        db_path = sqlite_path(get_settings().database_url)
    except InvalidError:
        print("backup only handles SQLite; use pg_dump for PostgreSQL", file=sys.stderr)
        return 1
    target = backup_sqlite(db_path, Path(args.out_dir), args.keep)
    print(target)
    return 0


def _month(text: str | None) -> JMonth | None:
    """`1405-08` → that Jalali month; None means the latest month sheet in the workbook."""
    if not text:
        return None
    year, month = (int(x) for x in text.replace("/", "-").split("-")[:2])
    return JMonth(year, month)


def _source(path: str) -> Path | BytesIO:
    # `-` reads stdin, so the file can be piped into the read-only container:
    # docker compose exec -T taraz python -m app.cli import-month - < aban.xlsx
    return BytesIO(sys.stdin.buffer.read()) if path == "-" else Path(path)


def cmd_convert_spreadsheet(args: argparse.Namespace) -> int:
    try:
        book, month = convert_month(Path(args.source), _month(args.month))
    except InvalidError:
        print("No sheet for that month in the workbook.", file=sys.stderr)
        return 1
    Path(args.out).write_bytes(write_book(book))
    receivable = sum(p.balance for p in book.patients if p.balance > 0)
    print(
        f"wrote {args.out} ({month.label}): {len(book.lines)} transactions, "
        f"{len(book.patients)} patients, {len(book.accounts)} accounts, "
        f"{len(book.issues)} rows to review; receivable {receivable:,} rials"
    )
    return 0


def cmd_import_month(args: argparse.Namespace) -> int:
    with new_session() as db:
        replaced = count_transactions(db) if args.replace else 0
        try:
            result = import_month(
                db,
                _source(args.path),
                _month(args.month),
                dry_run=args.dry_run,
                replace=args.replace,
                force=args.force,
            )
        except InvalidError:
            print("No sheet for that month in the workbook.", file=sys.stderr)
            return 1
        except ConflictError:
            print(
                "This month already has entries in the app; importing it again would count "
                "them twice. Pass --force if that is really wanted.",
                file=sys.stderr,
            )
            return 1
    s = result.summary
    print(
        f"{'[dry run, nothing saved] ' if args.dry_run else ''}"
        f"{f'replaced {replaced} earlier transactions; ' if args.replace else ''}"
        f"{result.month.label}: {s.transactions} transactions; ledger now has {s.patients} "
        f"patients, receivable {s.receivable:,}, credit {s.credit:,} rials"
    )
    if result.book.issues:
        print(f"{len(result.book.issues)} rows to look at:")
        for issue in result.book.issues:
            print(f"  {issue.source}  {issue.patient}: {issue.text}")
    return 0


def cmd_import_workbook(args: argparse.Namespace) -> int:
    result = read_book(_source(args.path))
    if result.errors:
        print(f"{len(result.errors)} invalid rows; nothing imported:", file=sys.stderr)
        for error in result.errors[:50]:
            print(f"  {error}", file=sys.stderr)
        return 1
    with new_session() as db:
        replaced = count_transactions(db) if args.replace else 0
        try:
            summary = import_book(
                db, result.book, dry_run=args.dry_run, force=args.force, replace=args.replace
            )
        except ConflictError:
            print(
                "The ledger already has transactions; pass --replace to swap it for this "
                "workbook, or --force to add to it.",
                file=sys.stderr,
            )
            return 1
    print(
        f"{'[dry run, nothing saved] ' if args.dry_run else ''}"
        f"{f'replaced {replaced} earlier transactions; ' if args.replace else ''}"
        f"{summary.transactions} transactions, {summary.patients} patients, "
        f"{summary.accounts} accounts, {summary.treatments} treatment cases; "
        f"receivable {summary.receivable:,}, credit {summary.credit:,}, "
        f"pending cheques {summary.pending_cheques:,} rials"
    )
    return 0


def cmd_seed_demo(_: argparse.Namespace) -> int:
    with new_session() as db:
        try:
            seed_demo(db)
        except ConflictError:
            print("The ledger is not empty; demo data is only seeded into an empty database.")
            return 1
    print("Seeded demo data.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("hash-password", help="print an AUTH_PASSWORD_HASH line for .env").set_defaults(
        fn=cmd_hash_password
    )
    bak = sub.add_parser("backup", help="copy the SQLite database into a directory")
    bak.add_argument("out_dir")
    bak.add_argument("--keep", type=int, default=30, help="how many backups to keep")
    bak.set_defaults(fn=cmd_backup)
    std = sub.add_parser(
        "convert-spreadsheet", help="practice workbook → standard workbook for review"
    )
    std.add_argument("source")
    std.add_argument("out")
    std.add_argument("--month", help="Jalali month, e.g. 1405-08 (default: the latest sheet)")
    std.set_defaults(fn=cmd_convert_spreadsheet)
    imp = sub.add_parser("import-workbook", help="load a reviewed standard workbook")
    imp.add_argument("path", help="the .xlsx file, or - for stdin")
    imp.add_argument("--dry-run", action="store_true", help="check and summarize, save nothing")
    imp.add_argument("--force", action="store_true", help="import even if the ledger is not empty")
    imp.add_argument(
        "--replace",
        action="store_true",
        help="remove every patient, account and transaction first (take a backup before)",
    )
    imp.set_defaults(fn=cmd_import_workbook)
    mon = sub.add_parser(
        "import-month", help="add one month sheet on top of the months already imported"
    )
    mon.add_argument("path", help="the .xlsx file, or - for stdin")
    mon.add_argument("--month", help="Jalali month, e.g. 1405-09 (default: the latest sheet)")
    mon.add_argument("--dry-run", action="store_true", help="check and summarize, save nothing")
    mon.add_argument(
        "--replace",
        action="store_true",
        help="remove every patient, account and transaction first (take a backup before)",
    )
    mon.add_argument("--force", action="store_true", help="import even if the month has entries")
    mon.set_defaults(fn=cmd_import_month)
    sub.add_parser("seed-demo", help="fill an empty database with fake data").set_defaults(
        fn=cmd_seed_demo
    )
    args = parser.parse_args(argv)
    return int(args.fn(args))


if __name__ == "__main__":
    raise SystemExit(main())
