#!/usr/bin/env bash
# Replace the ledger with a pg_dump file:  ./ops/restore.sh /path/to/taraz.dump
#
# Backs up what is there first, stops the app so nothing writes mid-restore,
# restores in one transaction (all or nothing), and starts the app again. Used
# once to bring the books onto the server, and to roll back to a backup.
set -euo pipefail
cd "$(dirname "$0")/.."

dump=${1:?usage: ops/restore.sh FILE.dump}
[[ -r "$dump" ]] || { echo "✗  cannot read $dump" >&2; exit 1; }

docker compose up -d --wait taraz-db
has_books=$(docker compose exec -T taraz-db psql -U dental -d taraz -tAc \
  "SELECT to_regclass('public.patients') IS NOT NULL")
if [[ "$has_books" == t ]]; then ./ops/backup.sh; fi

docker compose stop taraz
docker compose exec -T taraz-db pg_restore -U dental -d taraz \
  --clean --if-exists --no-owner --no-privileges --single-transaction --exit-on-error <"$dump"
docker compose up -d --wait taraz
echo "✓  restored $dump"
