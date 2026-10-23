"""Admin commands.

python -m app.cli hash-password
python -m app.cli backup /data/backups [--keep 30]
python -m app.cli import-debtors path/to/sheet.xlsx [--as-of 1405-08-01] [--dry-run]
python -m app.cli seed-demo        # fake data, for trying the UI
"""

import argparse
import getpass
import sys
from pathlib import Path

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.errors import ConflictError, InvalidError
from app.core.security import hash_password
from app.services import importer
from app.services.backup import backup_sqlite, sqlite_path
from app.services.demo import seed_demo
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


def cmd_import_debtors(args: argparse.Namespace) -> int:
    as_of = parse_jalali(args.as_of) if args.as_of else today()
    if as_of is None:
        print(f"Could not read --as-of {args.as_of!r}; use e.g. 1405-08-01", file=sys.stderr)
        return 1
    with SessionLocal() as db:
        if importer.has_transactions(db) and not args.force and not args.dry_run:
            print("The ledger already has transactions; pass --force to import anyway.")
            return 1
        result = importer.run(db, Path(args.path), as_of, dry_run=args.dry_run)
    print(
        f"{'[dry run] ' if args.dry_run else ''}"
        f"rows: {len(result.rows)}, charges: {result.charges}, pending cheques: {result.cheques}, "
        f"new patients: {result.patients_created}, matched existing: {result.patients_matched}"
    )
    for line, reason in result.skipped:
        print(f"  skipped row {line}: {reason}")
    if result.review_lines:
        lines = ", ".join(str(n) for n in sorted(result.review_lines))
        print(
            "  review: these rows mix a plain balance with cheques for the same patient; "
            f"check the cheques are not counted twice (rows {lines})"
        )
    return 0


def cmd_seed_demo(_: argparse.Namespace) -> int:
    with SessionLocal() as db:
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
    imp = sub.add_parser("import-debtors", help="import the debtors sheet of the old workbook")
    imp.add_argument("path")
    imp.add_argument("--as-of", help="Jalali date for the opening entries (default: today)")
    imp.add_argument("--dry-run", action="store_true")
    imp.add_argument("--force", action="store_true", help="import even if the ledger is not empty")
    imp.set_defaults(fn=cmd_import_debtors)
    sub.add_parser("seed-demo", help="fill an empty database with fake data").set_defaults(
        fn=cmd_seed_demo
    )
    args = parser.parse_args(argv)
    return int(args.fn(args))


if __name__ == "__main__":
    raise SystemExit(main())
