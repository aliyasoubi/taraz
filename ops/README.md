# Deploying Taraz beside patient-book (taraz.dentixo.ir)

Taraz runs as its own Docker Compose project on the same VPS: the app (NestJS
API serving the built Angular app) and its Postgres database. patient-book's
Caddy, which already owns ports 80/443 for `dentixo.ir`, also serves
`taraz.dentixo.ir` and forwards it to the Taraz container.

```
                   :443
 iPhone ──► Caddy (patient-book `web`) ──┬── dentixo.ir        ──► patient-book (unchanged)
                                         └── taraz.dentixo.ir  ──► taraz:3400 ──► taraz-db (Postgres 17)
```

What keeps patient-book safe:

- **Separate project.** `/opt/taraz` is compose project `taraz`. Its commands
  (`up`, `down`, `--remove-orphans`, image prune) never touch patient-book's
  containers, volumes or database.
- **The database stays inside.** `taraz-db` is only on Taraz's own network;
  only the app container joins patient-book's network, so Caddy can reach it.
- **No restarts.** Taraz publishes its site as a file that patient-book's Caddy
  imports, then asks Caddy to *reload*: the new config is validated first and
  swapped in without dropping connections; an invalid file is refused and the
  old config keeps running.
- **Resource caps.** The app is limited to 1 CPU, 384 MB and 200 processes,
  read-only, no capabilities; the database to 1 CPU and 512 MB.
- **Own data and backups.** Postgres in the `taraz_pg` volume; daily dumps go
  to `/var/backups/taraz`.

---

## Moving from the old app (once)

The old Python app is replaced in place: same folder, same domain, same compose
project. Its SQLite volume is left alone as a fallback. The books come from the
Postgres database on your Mac.

### 1. Last backup of the old app — before pulling

The pull replaces `ops/backup.sh`, so take the old app's backup first, with its
own script:

```bash
cd /opt/taraz && ./ops/backup.sh
```

### 2. Pull the new setup and write `.env`

```bash
git pull --ff-only
```

```bash
mv .env .env.old && cp .env.production.example .env && chmod 600 .env
```

Fill in `DB_PASSWORD` and `JWT_SECRET`, each generated on the VPS:

```bash
openssl rand -hex 24
```

```bash
openssl rand -hex 48
```

If the VPS cannot reach Docker Hub or the npm registry, set the mirror lines at
the bottom of `.env` (the old `.env.old` shows which Docker mirror worked).

### 3. Deploy

```bash
./ops/deploy.sh
```

It builds the image, starts the database and the app (the app creates the empty
schema), replaces the old container, re-publishes the Caddy site (the port
changed from 8000 to 3400), reloads Caddy and checks
`https://taraz.dentixo.ir/api/health`.

### 4. Bring the books over from the Mac

On the Mac — a dump of the real database, kept out of the repository folder:

```bash
pg_dump -U dental -d taraz --format=custom --file ~/taraz.dump && chmod 600 ~/taraz.dump
```

```bash
scp ~/taraz.dump <user>@<vps>:/tmp/taraz.dump
```

On the VPS:

```bash
cd /opt/taraz && ./ops/restore.sh /tmp/taraz.dump
```

```bash
rm /tmp/taraz.dump
```

Then on the Mac:

```bash
rm ~/taraz.dump
```

Sign in with the same username and password as on the Mac — the users came
over with the books.

### 5. Afterwards

The old app's data stays in the `taraz_taraz_data` volume, and its backups in
`/var/backups/taraz` (`taraz-*.db`). Once you are sure, remove the volume:

```bash
docker volume rm taraz_taraz_data
```

The daily backup timer from the old setup calls `/opt/taraz/ops/backup.sh`, so
it now runs the new script. Check it is still enabled:

```bash
systemctl list-timers taraz-backup.timer
```

---

## First install on a new server

Same as above without steps 1 and 5: point a DNS A record `taraz` at the VPS,
make sure patient-book's Caddyfile ends with
`import /etc/caddy/sites/*.caddy` and mounts `/opt/caddy/sites` read-only, then:

```bash
sudo git clone https://github.com/aliyasoubi/taraz.git /opt/taraz && cd /opt/taraz
```

```bash
cp .env.production.example .env && chmod 600 .env
```

Fill in `.env`, run `./ops/deploy.sh`, then restore the books (step 4) and
schedule the backups:

```bash
sudo cp ops/taraz-backup.service ops/taraz-backup.timer /etc/systemd/system/
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now taraz-backup.timer
```

## Backups

`ops/backup.sh` writes a `pg_dump` (custom format, consistent while the app
runs) to `/var/backups/taraz`, keeping 90 days. `deploy.sh` runs it before every
upgrade, the timer daily at 03:30. Copy `/var/backups/taraz` off the server with
patient-book's backups.

Roll back to a backup (the current state is backed up first):

```bash
./ops/restore.sh /var/backups/taraz/taraz-<date>.dump
```

## Updates

```bash
cd /opt/taraz && ./ops/deploy.sh
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

(`down` without `-v` keeps the database volume.)
