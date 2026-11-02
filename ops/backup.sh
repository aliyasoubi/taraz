#!/usr/bin/env bash
# A pg_dump of the ledger to $BACKUP_DIR on the host, last 90 days kept:  ./ops/backup.sh
#
# Custom format, consistent while the app runs; ops/restore.sh reads it back.
# Run daily by taraz-backup.timer and before every deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077

BACKUP_DIR=${BACKUP_DIR:-/var/backups/taraz}
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

file="$BACKUP_DIR/taraz-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T taraz-db pg_dump -U dental -d taraz --format=custom >"$file.partial"
mv "$file.partial" "$file"
find "$BACKUP_DIR" -name 'taraz-*.dump' -mtime +90 -delete
echo "backup: $file"
