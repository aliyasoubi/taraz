# Deploying Taraz next to patient-book

One container, no published ports. patient-book's Caddy already terminates TLS
on 80/443; Taraz joins its Docker network and Caddy proxies a subdomain to it.

```
                 :443
 iPhone ──► Caddy (patient-book `web`) ──┬── dentixo domain ──► patient-book
                                         └── TARAZ_DOMAIN   ──► taraz:8000 ──► /data/taraz.db
```

Why not Vercel: the ledger is medical-financial data for one person. On the VPS
it stays on a server you control, next to the app it belongs with, with no
third-party database, no cold starts, and no dependency on a US platform that
may be blocked or sanction-restricted from Iran. SQLite in a volume is enough
for a single user and backs up as one file.

## First deploy

1. DNS: an A record for the subdomain (e.g. `taraz.example.ir`) pointing at the VPS.

2. Code and secrets:

   ```bash
   git clone git@github.com:<you>/<repo>.git /opt/taraz && cd /opt/taraz
   cp .env.production.example .env && chmod 600 .env
   openssl rand -base64 48   # → SECRET_KEY in .env
   docker compose build
   docker compose run --rm --no-deps taraz python -m app.cli hash-password
   ```

   Paste the printed `AUTH_PASSWORD_HASH='…'` line into `.env` (keep the quotes).
   If the build cannot reach Docker Hub or PyPI, set the mirror variables at the
   bottom of `.env` first.

3. Start it (patient-book must already be running, so its network exists):

   ```bash
   docker compose up -d
   docker compose ps   # wait for "healthy"
   ```

4. Caddy, in the patient-book repo: append [`Caddyfile.snippet`](Caddyfile.snippet)
   to `ops/deploy/Caddyfile`, add `TARAZ_DOMAIN: ${TARAZ_DOMAIN:?…}` to the `web`
   service's environment in `compose.prod.yml`, set `TARAZ_DOMAIN` in its `.env`,
   and redeploy patient-book. Caddy obtains the certificate on first request.

5. On the iPhone: open the subdomain in Safari → Share → **Add to Home Screen**.

## Backups

`ops/backup.sh` takes a consistent SQLite snapshot (online backup API, safe while
the app is running) into the volume, keeping 30, and copies it to
`/var/backups/taraz` on the host, keeping 90 days. `deploy.sh` runs it before
every upgrade. Schedule it daily:

```bash
sudo cp ops/taraz-backup.service ops/taraz-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now taraz-backup.timer
```

Copy `/var/backups/taraz` off the server too (the same place patient-book's
backups go). Restore = stop the container, copy a snapshot over
`/data/taraz.db` in the volume, start it.

The app's Settings → "full backup (Excel)" also downloads every row as a workbook.

## Updates

```bash
cd /opt/taraz && ./ops/deploy.sh
```

Or from GitHub: Actions → Deploy → Run workflow. That needs secrets
`TARAZ_DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, and on the VPS an
`authorized_keys` entry that pins the key to one command:

```
command="cd /opt/taraz && ./ops/deploy.sh",no-port-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA… taraz-deploy
```

## Running it without patient-book

Give it its own port instead of the external network, e.g. a
`compose.override.yml`:

```yaml
services:
  taraz:
    ports: ["127.0.0.1:8010:8000"]
    networks: !reset [default]
networks:
  proxy: !reset null
```

and put any TLS-terminating proxy in front of `127.0.0.1:8010`. Never expose it
over plain HTTP: the session cookie is `Secure`.
