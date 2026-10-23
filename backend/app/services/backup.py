import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from app.core.errors import InvalidError

_SQLITE_PREFIX = "sqlite:///"


def sqlite_path(database_url: str) -> Path:
    if not database_url.startswith(_SQLITE_PREFIX):
        raise InvalidError("backup_needs_sqlite")
    return Path(database_url.removeprefix(_SQLITE_PREFIX))


def backup_sqlite(db_path: Path, out_dir: Path, keep: int) -> Path:
    """Consistent copy of a live SQLite database (online backup API), pruned to `keep` files."""
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    target = out_dir / f"taraz-{stamp}.db"
    with sqlite3.connect(db_path) as src, sqlite3.connect(target) as dst:
        src.backup(dst)
    for old in sorted(out_dir.glob("taraz-*.db"))[:-keep]:
        old.unlink()
    return target
