# Radio & Icecast — Volume Isolation Fix

**Written:** 25 August 2026
**Server:** `vmi2602465` (Coolify v4.0.0-beta.462, `coolify.supersoul.top`)
**Audience:** whoever works on `radio.supersoul.top` / `icecast.supersoul.top` next.

---

## ⛔ THE ONE HARD RULE

**Do not touch `labor-database.supersoul.top` in any way.**

That is a live client application (Labor Heritage Foundation). It caused an
18-minute production outage on 25 Aug 2026 and must not be disturbed again.

| Never do this | Why |
|---|---|
| Stop, restart, or redeploy container `og4ccgs0s0cw80kccskgksww-*` | Live client app |
| Change anything in the Coolify app **Labor Database** | Live client app |
| Delete or move `/app/data/dev.db`, `dev.db-wal`, `dev.db-shm` | That is the client's database |
| Delete anything in `/app/uploads` | Contains the client's entry images |
| Run `prisma migrate` / `db push` against `/app/data/dev.db` | Client's schema |

**Everything in this document happens to the radio and icecast apps only.**
Labor Database is never stopped, never redeployed, never reconfigured.

---

## The problem

Three Coolify apps **bind-mount the same host directory** `/app/data` instead of
each having its own named volume:

| Container | App | Mounts |
|---|---|---|
| `og4ccgs0s0cw80kccskgksww-*` | **labor-database** ⛔ leave alone | `/app/data`, `/app/uploads` |
| `cc008s4ggks4kwgcw4oos0oo-*` | radio.supersoul.top | `/app/data`, `/app/uploads`, `/app/recordings` |
| `tkgs40k8wo0kwo4w8kgowg8o-*` | icecast.supersoul.top | `/app/data` |

Worse: **radio and labor-database use the same SQLite file.**

```
$ docker inspect cc008s4ggks4kwgcw4oos0oo-...
DATABASE_URL=file:/app/data/dev.db      ← identical to labor-database

$ lsof /app/data/dev.db
node       4829  root  47ur  REG  8,1  9064448  4456477  /app/data/dev.db   ← radio
node    2631460  root  34ur  REG  8,1  9064448  4456477  /app/data/dev.db   ← labor-database
```

Same inode. Two applications, two Prisma schemas, one database file.

**Consequence:** radio holds a permanent connection, so `prisma migrate deploy`
on labor-database can never acquire the exclusive lock a schema change needs.
Its migrations have failed silently on **every deploy** for months. On 25 Aug a
deploy finally depended on one and the client site served errors for 18 minutes.

Labor Landmarks shows the correct pattern:

```
skswcso44gcoc0c0soggsskg-labor-landmarks-data/_data -> /app/data
```

A named volume, private to that app.

---

## Goal

Radio and icecast each get their **own** storage, and stop touching
`/app/data/dev.db` and `/app/uploads` entirely.

**Success = this returns only ONE process (labor-database's), forever:**

```sh
lsof /app/data/dev.db
```

---

## Step 0 — Backups (do not skip)

```sh
mkdir -p /root/backups/2026-08-25

# Consistent SQLite copy - handles WAL correctly, unlike cp
apt-get install -y sqlite3          # if not present
sqlite3 /app/data/dev.db ".backup /root/backups/2026-08-25/dev.db.bak"

# The other database files in the shared directory
cp -a /app/data/stations.db /root/backups/2026-08-25/ 2>/dev/null
cp -a /app/data/sqlite.db   /root/backups/2026-08-25/ 2>/dev/null

# Directory listing for reference
ls -la /app/data/ > /root/backups/2026-08-25/listing.txt
```

⚠️ **Use `sqlite3 .backup`, not `cp`, for any live SQLite file.** A plain `cp`
of a database with an active WAL can produce a corrupt copy.

⚠️ **Never delete `dev.db-wal` or `dev.db-shm`.** They contain committed data not
yet folded into the main file. Deleting them loses data.

---

## Step 1 — Find out what belongs to whom

```sh
sqlite3 /app/data/dev.db ".tables"
```

`dev.db` contains **both** applications' tables. Expect to see labor-database's
(`Entry`, `EntryImage`, `Category`, `_prisma_migrations`) alongside radio's.

Identify radio's tables before copying anything. Also check what icecast uses —
it has no `DATABASE_URL`, so it is probably using `stations.db` or `sqlite.db`,
or no database at all:

```sh
docker inspect tkgs40k8wo0kwo4w8kgowg8o-210210196537 \
  --format '{{range .Config.Env}}{{println .}}{{end}}'
```

---

## Step 2 — Isolate RADIO

Radio is the one that matters: it is the app sharing the database file.

1. **Stop radio** in Coolify (app: `radio.supersoul.top`).

2. **Confirm labor-database is now the only holder:**
   ```sh
   lsof /app/data/dev.db
   ```
   Should show one process. If it shows none, labor-database happens to be
   between connections — that is fine.

3. **Create a named volume** for radio in Coolify → radio → Persistent Storage,
   mounted at `/app/data`. Mirror the Labor Landmarks naming, e.g.
   `<app-uuid>-radio-data`.

4. **Seed the new volume with radio's data** — before first start:
   ```sh
   # find the new volume's host path
   docker volume ls | grep -i radio
   docker volume inspect <volume-name> --format '{{.Mountpoint}}'

   # copy radio's database into it (consistent copy)
   sqlite3 /app/data/dev.db ".backup /var/lib/docker/volumes/<volume-name>/_data/dev.db"

   # plus radio's other files, if it uses them
   cp -a /app/data/stations.db  /var/lib/docker/volumes/<volume-name>/_data/ 2>/dev/null
   cp -a /app/data/sqlite.db    /var/lib/docker/volumes/<volume-name>/_data/ 2>/dev/null
   cp -a /app/data/playlists    /var/lib/docker/volumes/<volume-name>/_data/ 2>/dev/null
   cp -a /app/data/audiofiles   /var/lib/docker/volumes/<volume-name>/_data/ 2>/dev/null
   ```

   Radio's copy will also contain labor-database's tables. Harmless — Prisma
   ignores tables not in its schema. Clean them up later if desired, **only in
   radio's copy**.

5. **Also isolate `/app/uploads`** — radio and labor-database share it, so
   uploads can collide. Give radio its own named volume for `/app/uploads` and
   copy across only the files radio owns.

6. **Start radio.** Verify it works: does it list stations, play audio, save
   changes?

7. **Confirm the fix:**
   ```sh
   lsof /app/data/dev.db
   ```
   **Radio must no longer appear.** Only labor-database's node process.

---

## Step 3 — Isolate ICECAST

Same pattern. Lower risk — it only mounts `/app/data` and may not use a database.

1. Stop icecast
2. Create a named volume mounted at `/app/data`
3. Copy across whatever it actually uses (see Step 1)
4. Start and verify
5. Confirm it no longer appears in `lsof /app/data/dev.db`

---

## Step 4 — Final verification

```sh
# 1. Only labor-database holds its database
lsof /app/data/dev.db

# 2. No other container bind-mounts the host /app/data
docker ps -q | xargs -r docker inspect \
  --format '{{.Name}} {{range .Mounts}}{{.Source}}->{{.Destination}} {{end}}' \
  | grep -E '/app/data->'
```

The second command should list **only** `og4ccgs0s0cw80kccskgksww-*`.

**Then tell whoever owns the Labor Database project.** They have a pending schema
change (the corrections feature) that has been blocked by this.

---

## Rollback

Nothing here is destructive if the rules are followed — the original
`/app/data` is left untouched and radio/icecast run from *copies*.

If radio or icecast misbehaves on its new volume:
1. Stop the app
2. Point its Persistent Storage back to the bind mount `/app/data`
3. Start it

It will work exactly as before. The original files were never modified.

⚠️ Only revert if strictly necessary — reverting re-creates the lock that broke
the client site.

---

## Why this matters beyond the bug

- **Data integrity.** Two apps writing one SQLite file, each schema unaware of
  the other's tables, is a corruption risk that has simply not fired yet.
- **Sellability.** Radio and icecast have commercial potential. An app that
  cannot be moved without dragging another product's database with it is not
  something you can hand over. Each app owning its own volume is what any buyer
  or second developer would expect.
- **The client app stays unblocked.** Labor Database has pending schema changes
  (public corrections, admin-managed tags). Every one of them fails while radio
  holds that file.

---

## Reference — facts gathered 25 Aug 2026

```
$ ls -la /app/data/
drwxr-xr-x  3 root root     4096 Dec 29  2025 audiofiles      ← radio
-rw-r--r--  1 root root  9064448 Aug 24 02:41 dev.db          ← SHARED (the bug)
-rw-r--r--  1 root root    32768 Aug 25 02:41 dev.db-shm
-rw-r--r--  1 root root   230752 Aug 25 02:41 dev.db-wal
-rw-r--r--  1 root root        0 Mar  7 15:30 migrate.lock    ← stale, from an old entrypoint
drwxr-xr-x  2 root root     4096 Dec 28  2025 playlists       ← radio
-rw-r--r--  1 root root    86016 Feb 23  2026 sqlite.db       ← radio or icecast
-rw-r--r--  1 root root   110592 Jan 15  2026 stations.db     ← radio or icecast
```

Container names change on each deploy — re-check with `docker ps` rather than
copying the suffixes above.

Full incident write-up: `HANDOFF.md` in the labor-database repo (BUG-6).
