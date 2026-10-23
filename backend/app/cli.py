"""Admin commands.

python -m app.cli hash-password
python -m app.cli backup /data/backups [--keep 30]
python -m app.cli import-debtors path/to/sheet.xlsx [--as-of 1405-08-01] [--dry-run]
python -m app.cli seed-demo        # fake data, for trying the UI
"""

import argparse
import getpass
import random
import sqlite3
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.config import get_settings
from app.db import SessionLocal
from app.models import (
    Account,
    AccountKind,
    ChequeStatus,
    Patient,
    PaymentMethod,
    Transaction,
    Treatment,
    TreatmentKind,
    TxType,
)
from app.security import hash_password
from app.services import importer
from app.services.jalali import parse_jalali, today
from app.services.text import fold


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


def backup_sqlite(db_path: Path, out_dir: Path, keep: int) -> Path:
    """Consistent copy of a live SQLite database (online backup API), pruned to `keep` files."""
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    target = out_dir / f"taraz-{stamp}.db"
    with sqlite3.connect(db_path) as src, sqlite3.connect(target) as dst:
        src.backup(dst)
    for old in sorted(out_dir.glob("taraz-*.db"))[:-keep]:
        old.unlink()
    return target


def cmd_backup(args: argparse.Namespace) -> int:
    url = get_settings().database_url
    if not url.startswith("sqlite:///"):
        print("backup only handles SQLite; use pg_dump for PostgreSQL", file=sys.stderr)
        return 1
    target = backup_sqlite(Path(url.removeprefix("sqlite:///")), Path(args.out_dir), args.keep)
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


_FIRST = [
    "سپهر",
    "آرمان",
    "کیانا",
    "ترانه",
    "بردیا",
    "شایان",
    "پرهام",
    "آوا",
    "هومن",
    "رایان",
    "ستاره",
    "آرمین",
    "آرین",
    "ماهان",
    "پگاه",
    "رادین",
]
_LAST = ["آسمانی", "صبوری", "روشن‌دل", "کوهستانی", "دریایی", "بهاری", "مهرآیین", "نیک‌نام"]


def cmd_seed_demo(_: argparse.Namespace) -> int:
    rng = random.Random(1405)
    with SessionLocal() as db:
        if importer.has_transactions(db):
            print("The ledger is not empty; demo data is only seeded into an empty database.")
            return 1
        accounts = [
            Account(
                title="ملت — شخصی",
                owner_name="خودم",
                bank="ملت",
                kind=AccountKind.OWN,
                card_last4="4821",
                color="violet",
            ),
            Account(
                title="بلو — منشی",
                owner_name="منشی",
                bank="بلو",
                kind=AccountKind.STAFF,
                card_last4="1190",
                color="sky",
            ),
            Account(title="کارتخوان تجارت", bank="تجارت", kind=AccountKind.POS, color="emerald"),
            Account(
                title="آقای قمی",
                owner_name="آقای قمی",
                bank="سامان",
                kind=AccountKind.THIRD_PARTY,
                color="amber",
            ),
            Account(title="صندوق", kind=AccountKind.CASH, color="rose"),
        ]
        db.add_all(accounts)
        db.flush()
        now = today()
        names = rng.sample([f"{f} {last}" for f in _FIRST for last in _LAST], 18)
        for name in names:
            p = Patient(
                name=name, name_search=fold(name), phone=f"0912{rng.randint(1000000, 9999999)}"
            )
            db.add(p)
            db.flush()
            kind = rng.choice(
                [
                    TreatmentKind.GENERAL,
                    TreatmentKind.IMPLANT,
                    TreatmentKind.ORTHO,
                    TreatmentKind.LAMINATE,
                ]
            )
            t = Treatment(
                patient_id=p.id,
                title={
                    "general": "درمان عمومی",
                    "implant": "ایمپلنت",
                    "ortho": "ارتودنسی",
                    "laminate": "لمینت",
                }[kind],
                kind=kind,
                doctor=rng.choice(["دکتر شاهین", "دکتر افشار", None]),
            )
            db.add(t)
            db.flush()
            total = rng.choice([45, 120, 380, 900, 1500, 2600]) * 10_000_000
            start = now - timedelta(days=rng.randint(20, 150))
            db.add(
                Transaction(
                    patient_id=p.id,
                    treatment_id=t.id,
                    type=TxType.CHARGE,
                    amount=total,
                    occurred_on=start,
                    description="طرح درمان",
                )
            )
            paid = 0
            for _k in range(rng.randint(0, 4)):
                amount = rng.choice([5, 10, 15, 30, 50]) * 10_000_000
                if paid + amount > total:
                    break
                paid += amount
                d = start + timedelta(days=rng.randint(0, (now - start).days))
                cheque = rng.random() < 0.15
                db.add(
                    Transaction(
                        patient_id=p.id,
                        treatment_id=t.id,
                        type=TxType.PAYMENT,
                        amount=amount,
                        occurred_on=d,
                        payer_name=rng.choice([None, None, None, "همسر بیمار", "پدر بیمار"]),
                        account_id=rng.choice(accounts).id,
                        method=PaymentMethod.CHEQUE
                        if cheque
                        else rng.choice(
                            [PaymentMethod.CARD, PaymentMethod.POS, PaymentMethod.TRANSFER]
                        ),
                        cheque_due_on=d + timedelta(days=rng.randint(10, 60)) if cheque else None,
                        cheque_status=ChequeStatus.PENDING if cheque else None,
                    )
                )
        db.commit()
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
    imp = sub.add_parser("import-debtors", help="import the «لیست بدهکاران» sheet")
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
