"""Admin commands.

python -m app.cli hash-password
python -m app.cli backup /data/backups [--keep 30]
python -m app.cli standardize-legacy old.xlsx standard.xlsx [--as-of 1405-08-01]
python -m app.cli import-workbook standard.xlsx [--dry-run]
python -m app.cli seed-demo        # fake data, for trying the UI
"""

import argparse
import getpass
import sys
from pathlib import Path

from app.core.config import get_settings
from app.core.db import new_session
from app.core.errors import ConflictError, InvalidError
from app.core.security import hash_password
from app.services.backup import backup_sqlite, sqlite_path
from app.services.demo import seed_demo
from app.services.legacy.convert import convert_legacy
from app.services.workbook.importer import import_book
from app.services.workbook.reader import read_book
from app.services.workbook.writer import write_book
from app.utils.jalali import parse_jalali, today


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


def cmd_standardize_legacy(args: argparse.Namespace) -> int:
    as_of = parse_jalali(args.as_of) if args.as_of else today()
    if as_of is None:
        print(f"Could not read --as-of {args.as_of!r}; use e.g. 1405-08-01", file=sys.stderr)
        return 1
    book = convert_legacy(Path(args.source), as_of, settle_unlisted=args.settle_unlisted)
    Path(args.out).write_bytes(write_book(book))
    receivable = sum(p.balance for p in book.patients if p.balance > 0)
    print(
        f"wrote {args.out}: {len(book.lines)} transactions, {len(book.patients)} patients, "
        f"{len(book.accounts)} accounts, {len(book.issues)} rows to review; "
        f"receivable {receivable:,} rials"
    )
    return 0


def cmd_import_workbook(args: argparse.Namespace) -> int:
    result = read_book(Path(args.path))
    if result.errors:
        print(f"{len(result.errors)} invalid rows; nothing imported:", file=sys.stderr)
        for error in result.errors[:50]:
            print(f"  {error}", file=sys.stderr)
        return 1
    with new_session() as db:
        try:
            summary = import_book(db, result.book, dry_run=args.dry_run, force=args.force)
        except ConflictError:
            print(
                "The ledger already has transactions; pass --force to add to it.", file=sys.stderr
            )
            return 1
    print(
        f"{'[dry run, nothing saved] ' if args.dry_run else ''}"
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
    std = sub.add_parser("standardize-legacy", help="old workbook → standard workbook for review")
    std.add_argument("source")
    std.add_argument("out")
    std.add_argument("--as-of", help="Jalali date of the debtors list (default: today)")
    std.add_argument(
        "--settle-unlisted",
        action="store_true",
        help="close every balance that is not on the debtors list (default: keep and flag)",
    )
    std.set_defaults(fn=cmd_standardize_legacy)
    imp = sub.add_parser("import-workbook", help="load a reviewed standard workbook")
    imp.add_argument("path")
    imp.add_argument("--dry-run", action="store_true", help="check and summarize, save nothing")
    imp.add_argument("--force", action="store_true", help="import even if the ledger is not empty")
    imp.set_defaults(fn=cmd_import_workbook)
    sub.add_parser("seed-demo", help="fill an empty database with fake data").set_defaults(
        fn=cmd_seed_demo
    )
    args = parser.parse_args(argv)
    return int(args.fn(args))


if __name__ == "__main__":
    raise SystemExit(main())
