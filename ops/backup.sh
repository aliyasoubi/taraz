#!/usr/bin/env bash
# Consistent snapshot of the SQLite ledger into the data volume (/data/backups,
# last 30 kept), then a copy out to $BACKUP_DIR on the host so it survives the
# volume. Run daily by taraz-backup.timer and before every deploy.
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_DIR=${BACKUP_DIR:-/var/backups/taraz}
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

file=$(docker compose exec -T taraz python -m app.cli backup /data/backups --keep 30)
docker compose cp "taraz:${file}" "$BACKUP_DIR/"
# Host copies: keep 90 days.
find "$BACKUP_DIR" -name 'taraz-*.db' -mtime +90 -delete
echo "backup: $BACKUP_DIR/$(basename "$file")"
