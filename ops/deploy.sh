#!/usr/bin/env bash
# Pull main, back up, roll the container, publish the Caddy site:  ./ops/deploy.sh
#
# Touches only the `taraz` compose project. patient-book is never restarted: its
# Caddy is asked to *reload*, which validates the new config first and keeps the
# old one if anything is wrong.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo "✗  no .env — see .env.production.example" >&2; exit 1; }
set -a; source .env; set +a
: "${TARAZ_DOMAIN:?set TARAZ_DOMAIN in .env}"
CADDY_SITES=${CADDY_SITES:-/opt/caddy/sites}
PB_PROJECT=${PB_PROJECT:-patient-book}

git pull --ff-only

# First deploy has no running container to back up yet.
if docker compose ps --status running --services 2>/dev/null | grep -qx taraz; then
  ./ops/backup.sh
fi

docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null

echo "→ waiting for taraz to become healthy"
for _ in $(seq 1 30); do
  status=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q taraz)" 2>/dev/null || echo starting)
  [[ "$status" == healthy ]] && break
  sleep 2
done
if [[ "$status" != healthy ]]; then
  echo "✗  taraz did not become healthy; recent logs:" >&2
  docker compose logs --tail 50 taraz >&2
  exit 1
fi

echo "→ publishing the Caddy site for $TARAZ_DOMAIN"
mkdir -p "$CADDY_SITES"
rendered=$(sed "s|\${TARAZ_DOMAIN}|$TARAZ_DOMAIN|" ops/caddy/site.caddy.template)
if [[ ! -f "$CADDY_SITES/taraz.caddy" ]] || [[ "$rendered" != "$(cat "$CADDY_SITES/taraz.caddy")" ]]; then
  printf '%s\n' "$rendered" >"$CADDY_SITES/taraz.caddy"
  caddy_id=$(docker compose -p "$PB_PROJECT" ps -q web)
  [[ -n "$caddy_id" ]] || { echo "✗  patient-book's Caddy (service web) is not running" >&2; exit 1; }
  # Graceful: validates first, swaps without dropping connections, keeps the old config on error.
  docker exec "$caddy_id" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
fi

echo "→ checking https://$TARAZ_DOMAIN"
for _ in $(seq 1 12); do
  if curl -fsS --max-time 10 --resolve "$TARAZ_DOMAIN:443:127.0.0.1" "https://$TARAZ_DOMAIN/api/health" >/dev/null 2>&1; then
    echo "✓  taraz is live at https://$TARAZ_DOMAIN"
    exit 0
  fi
  sleep 5  # a first deploy may still be obtaining its certificate
done
echo "✗  https://$TARAZ_DOMAIN does not answer yet — check DNS and: docker compose -p $PB_PROJECT logs web" >&2
exit 1
