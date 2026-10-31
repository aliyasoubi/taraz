# Deploying Taraz beside patient-book (taraz.dentixo.ir)

Taraz runs as its own Docker Compose project on the same VPS. patient-book's
Caddy, which already owns ports 80/443 for `dentixo.ir`, also serves
`taraz.dentixo.ir` and forwards it to the Taraz container.

```
                   :443
 iPhone ──► Caddy (patient-book `web`) ──┬── dentixo.ir        ──► patient-book (unchanged)
                                         └── taraz.dentixo.ir  ──► taraz:8000 ──► /data/taraz.db
```

What keeps patient-book safe:

- **Separate project.** `/opt/taraz` is compose project `taraz`. Its commands
  (`up`, `down`, `--remove-orphans`, image prune) never touch patient-book's
  containers, volumes or database.
- **No restarts after day one.** Taraz publishes its site as a file that
  patient-book's Caddy imports, then asks Caddy to *reload*. A reload validates
  the new config first and swaps it in without dropping connections; an invalid
  file is rejected and the old config keeps running. (Rehearsed: 88 requests to
  patient-book during a reload, 0 failed; a broken site file was refused and
  both apps kept serving.)
- **Resource caps.** The Taraz container is limited to 1 CPU, 384 MB and 200
  processes, read-only, no capabilities.
- **Own data and backups.** SQLite in the `taraz_data` volume; backups go to
  `/var/backups/taraz`.

Why not Vercel: the ledger is medical-financial data; here it stays on your
server, next to patient-book, with no third-party database and no dependency on
a platform that can be blocked from Iran.

---

## 1. DNS (any time before step 4)

Add an **A record**: `taraz` → the VPS's IP (the same IP `dentixo.ir` uses).
Caddy requests the certificate on the first visit and renews it on its own.

## 2. One-time change in patient-book (the only time it restarts)

Two small edits in the patient-book repository, shipped with its normal deploy.
Pick a quiet moment: recreating the `web` container interrupts it for a few
seconds; certificates are kept in its volume.

`ops/deploy/Caddyfile` — at the very end:

```caddyfile
# Other apps on this VPS (e.g. Taraz) drop their site files here.
import /etc/caddy/sites/*.caddy
```

`compose.prod.yml` — service `web`, under `volumes:`:

```yaml
      # Site files of other apps on this VPS (Taraz). Read-only for Caddy.
      - /opt/caddy/sites:/etc/caddy/sites:ro
```

Then on the VPS:

```bash
sudo mkdir -p /opt/caddy/sites
```

```bash
cd /opt/patient-book && ./ops/deploy/deploy.sh
```

An empty `/opt/caddy/sites` is valid; patient-book behaves exactly as before.

## 3. Install Taraz

```bash
sudo git clone https://github.com/aliyasoubi/taraz.git /opt/taraz && cd /opt/taraz
```

```bash
cp .env.production.example .env && chmod 600 .env
```

Fill in `.env`:

- `TARAZ_DOMAIN=taraz.dentixo.ir` (already set)
- `SECRET_KEY` — `openssl rand -base64 48`
- `AUTH_PASSWORD_HASH` — after the first build:

```bash
docker compose build
```

```bash
docker compose run --rm --no-deps taraz python -m app.cli hash-password
```

  Paste the printed line into `.env`, keeping the single quotes.

If the VPS cannot reach Docker Hub or PyPI, uncomment the mirror lines at the
bottom of `.env` (ArvanCloud for images, Runflare for PyPI).

## 4. Go live

```bash
./ops/deploy.sh
```

It builds and starts Taraz, waits until it is healthy, writes
`/opt/caddy/sites/taraz.caddy` from `ops/caddy/site.caddy.template`, reloads
patient-book's Caddy, and checks `https://taraz.dentixo.ir`.

On the iPhone: open `https://taraz.dentixo.ir` in Safari → Share → **Add to Home Screen**.

## 5. Import the month sheet

Copy the workbook up from your Mac:

```bash
scp aban.xlsx <user>@<vps>:/tmp/month.xlsx
```

The container's filesystem is read-only, so the file is piped in (`-` reads
stdin). The first month starts the ledger afresh with `--replace`; take a
backup first:

```bash
cd /opt/taraz && ./ops/backup.sh
```

```bash
docker compose exec -T taraz python -m app.cli import-month - --month 1405-08 --replace --dry-run < /tmp/month.xlsx
```

```bash
docker compose exec -T taraz python -m app.cli import-month - --month 1405-08 --replace < /tmp/month.xlsx
```

Each later month (Azar = `1405-09`, …) goes on top without `--replace`. Each
patient then continues from their balance in the app. A month that already
has entries is refused, so nothing is counted twice.

```bash
rm /tmp/month.xlsx
```

## Backups

`ops/backup.sh` takes a consistent SQLite snapshot (safe while running) into the
volume, keeping 30, and copies it to `/var/backups/taraz`, keeping 90 days.
`deploy.sh` runs it before every upgrade. Schedule it daily:

```bash
sudo cp ops/taraz-backup.service ops/taraz-backup.timer /etc/systemd/system/
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now taraz-backup.timer
```

Copy `/var/backups/taraz` off the server with patient-book's backups. Restore:
stop the container, copy a snapshot over `/data/taraz.db` in the volume, start it.
Settings → "full backup (Excel)" in the app also downloads every row.

## Updates

```bash
cd /opt/taraz && ./ops/deploy.sh
```

Or GitHub → Actions → Deploy. That needs secrets `TARAZ_DEPLOY_SSH_KEY`,
`DEPLOY_HOST`, `DEPLOY_USER`, and an `authorized_keys` line on the VPS that pins
the key to one command:

```
command="cd /opt/taraz && ./ops/deploy.sh",no-port-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA… taraz-deploy
```

## Taking Taraz offline (patient-book unaffected)

```bash
sudo rm /opt/caddy/sites/taraz.caddy
```

```bash
docker exec "$(docker compose -p patient-book ps -q web)" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

```bash
cd /opt/taraz && docker compose down
```

(`down` without `-v` keeps the data volume.)
