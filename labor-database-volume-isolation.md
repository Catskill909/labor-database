# Labor Database — Volume Isolation (make it untouchable)

**Written:** 25 August 2026
**App:** `labor-database.supersoul.top` — **live client application (Labor Heritage Foundation)**
**Server:** `vmi2602465`, Coolify at `coolify.supersoul.top`
**Status:** NOT DONE. Do this when rested, on a quiet day. Not urgent.

---

## Why

Right now Labor Database uses a **bind mount** — the literal host folder
`/app/data`, shared with any other app pointed at the same path:

```
labor-database   /app/data->/app/data                                       ← shared, anyone can join
labor-landmarks  /var/lib/docker/volumes/...-labor-landmarks-data/_data->/app/data   ← private
```

On 25 Aug 2026 this caused an 18-minute client-facing outage: `radio.supersoul.top`
used the *same* database file (`DATABASE_URL=file:/app/data/dev.db`), held a
permanent connection, and blocked every `prisma migrate deploy`.

Moving radio and icecast out (see [radio-icecast-fixes.md](radio-icecast-fixes.md))
removes today's collision. **It does not prevent the next one.** Any future app
pointed at `/app/data` collides again, and nothing stops that from happening.

**A named volume makes it structurally impossible instead of a rule people have
to remember.** That is the difference between "fixed" and "fixed right".

---

## What changes

| | Before | After |
|---|---|---|
| Database | `/app/data` (shared host folder) | private named volume |
| Uploads | `/app/uploads` (shared host folder) | private named volume |
| Who else can reach it | any app pointed at that path | **nobody** |

Container paths do not change (`/app/data`, `/app/uploads`), so **no code changes
and no rebuild** — only Coolify storage config plus a one-time data copy.

---

## Before you start

- [ ] Do it at a **quiet time**. The app is down for the duration (~15–30 min).
- [ ] Do it when **rested**. This moves a client's data.
- [ ] Radio and icecast should already be isolated or stopped.
- [ ] Allow an hour. It will not take that long, but do not rush it.

**Expected downtime: 15–30 minutes.** The site is stopped while the data copies.

---

## Step 1 — Two backups

```sh
mkdir -p /root/backups/labor-db-$(date +%F)
cd /root/backups/labor-db-$(date +%F)

apt-get install -y sqlite3          # if needed

# Consistent SQLite copy - NEVER use cp on a live database with a WAL
sqlite3 /app/data/dev.db ".backup ./dev.db.bak"

# Entry images
tar czf uploads-entries.tgz -C /app/uploads entries

# Reference
ls -la /app/data/ > listing-data.txt
ls -la /app/uploads/ > listing-uploads.txt
sqlite3 /app/data/dev.db "SELECT category, count(*) FROM Entry GROUP BY category;" > counts-before.txt
cat counts-before.txt
```

**Also take a Full Backup ZIP** from the admin dashboard (Export → Full Backup).
That is the one that restores through the app if all else fails.

⚠️ **Never delete `dev.db-wal` or `dev.db-shm`.** They hold committed data not yet
folded into the main file. `sqlite3 .backup` handles them correctly; `cp` does not.

---

## Step 2 — Create the named volumes

Coolify → **Labor Database** → Configuration → Persistent Storage.

Add two **named volumes** (type a *name*, not a path — a path makes it a bind
mount, which is the bug being fixed):

| Name | Mount path |
|---|---|
| `labor-database-data` | `/app/data` |
| `labor-database-uploads` | `/app/uploads` |

**Do not remove the existing bind mounts yet.** Create the volumes first so the
data can be copied in, then swap.

---

## Step 3 — Stop the app

Coolify → Labor Database → **Stop**.

Confirm nothing holds the database:

```sh
lsof /app/data/dev.db          # should return nothing
```

If anything still appears, find out what it is before continuing.

---

## Step 4 — Copy the data in

```sh
# Locate the new volumes
docker volume ls | grep labor-database
DATA=$(docker volume inspect <data-volume-name>    --format '{{.Mountpoint}}')
UP=$(  docker volume inspect <uploads-volume-name> --format '{{.Mountpoint}}')
echo "$DATA" "$UP"

# Database - consistent copy
sqlite3 /app/data/dev.db ".backup $DATA/dev.db"

# Entry images (labor-database's images live only in uploads/entries)
mkdir -p "$UP/entries"
cp -a /app/uploads/entries/. "$UP/entries/"

# Verify before starting anything
sqlite3 "$DATA/dev.db" "SELECT category, count(*) FROM Entry GROUP BY category;"
ls "$UP/entries" | wc -l
ls /app/uploads/entries | wc -l      # the two counts must match
```

The row counts must match `counts-before.txt` from Step 1. **If they do not,
stop and investigate — do not start the app.**

---

## Step 5 — Swap the mounts

Coolify → Labor Database → Persistent Storage:

1. **Remove** the two bind mounts (`/app/data` and `/app/uploads`)
2. Leave the two named volumes mounted at the same container paths
3. **Start** the app

The original `/app/data` and `/app/uploads` on the host are left untouched — they
become the rollback copy.

---

## Step 6 — Verify

```sh
# 1. Mount source must now be a docker volume, not a bare path
docker inspect $(docker ps -qf name=og4ccgs) \
  --format '{{range .Mounts}}{{.Source}}->{{.Destination}}{{println}}{{end}}'
# expect /var/lib/docker/volumes/... on both lines

# 2. API healthy
curl -s https://labor-database.supersoul.top/api/health

# 3. Search works (accent fix relies on the search columns surviving the copy)
curl -s --get --data-urlencode "search=misère" \
  'https://labor-database.supersoul.top/api/entries?limit=3' | head -c 200
```

Then in a browser:
- [ ] Entry counts on the tabs match what they were (History ~1,438 · Quotes ~1,918 · Music ~437 · Films ~2,190)
- [ ] Open a film — **the poster image loads** (proves uploads copied)
- [ ] Search "Misère" returns the Borinage film
- [ ] On This Day renders
- [ ] Admin login works, and an entry edit saves

---

## Step 7 — Prove the real fix

The point of all this:

```sh
docker ps -q | xargs -r docker inspect \
  --format '{{.Name}} {{range .Mounts}}{{.Source}}->{{.Destination}} {{end}}' \
  | grep -E '/app/data->'
```

Labor Database must **not** appear in that list any more. Its storage is now
private and no future app can reach it, whatever anyone types into Coolify.

**Then test a migration.** Deploy any schema change and confirm
`prisma migrate deploy` applies cleanly. That is the outcome that was broken.

---

## Rollback

The original bind-mounted data at `/app/data` and `/app/uploads` is untouched
throughout. If anything is wrong:

1. Stop the app
2. Persistent Storage → remove the named volumes, re-add the bind mounts
   (`/app/data` → `/app/data`, `/app/uploads` → `/app/uploads`)
3. Start

You are back exactly where you started, with no data lost.

---

## Afterwards

- [ ] Delete the leftover `migrate.lock` (0 bytes, from an old entrypoint) — cosmetic
- [ ] Consider `ENV DATABASE_URL="file:/app/data/labor-database.db"` in the
      Dockerfile for any *new* app cloned from this template, so a shared folder
      can never mean a shared file again
- [ ] **Make `/api/health` touch the Entry table.** It runs a raw `SELECT 1`, so
      it reported healthy through the entire 25 Aug outage. This is the reason
      nothing caught it.
- [ ] Add a SIGTERM handler to the server for clean shutdown and WAL checkpoint

---

## The rule for every future app on this server

**Persistent Storage: always type a NAME, never a path.**

- name → `/var/lib/docker/volumes/<name>/_data` → private ✅
- path → that literal host folder → shared with anything else pointing there ⚠️

One command to check any container:

```sh
docker inspect <container> --format '{{range .Mounts}}{{.Source}} {{end}}'
```
