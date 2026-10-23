#!/usr/bin/env bash
# Pull main and roll the container. Backs the ledger up first, so a bad release
# never costs data:  ./ops/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only

# First deploy has no running container to back up yet.
if docker compose ps --status running --services 2>/dev/null | grep -qx taraz; then
  ./ops/backup.sh
fi

docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null

for _ in $(seq 1 30); do
  status=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q taraz)" 2>/dev/null || echo starting)
  if [ "$status" = healthy ]; then
    echo "taraz is up"
    exit 0
  fi
  sleep 2
done
echo "taraz did not become healthy; recent logs:" >&2
docker compose logs --tail 50 taraz >&2
exit 1
