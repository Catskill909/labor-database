#!/bin/sh

# Safety check: detect if /app/data volume is missing
if [ ! -f /app/data/dev.db ]; then
    echo '========================================'
    echo 'WARNING: No existing database found at /app/data/dev.db'
    echo 'A new database will be created.'
    echo '========================================'
fi

# Migrate ONLY when a migration is pending (same fix as Labor Landmarks, 25 Oct
# 2026). `prisma migrate deploy` needs a lock on the SQLite file, which the OLD
# container still holds while it serves - always on a rolling update (the LHF
# server's Coolify, no host port mapping), and for up to 10 s on this server's
# stop-then-start. Running it on every start is what failed every Landmarks
# deploy and caused this app's 25 Aug 2026 outage. `prisma migrate status` is
# read-only and works alongside the old server, so check first.
#
# When something IS pending, retry generously, then refuse to start on failure:
# starting anyway served 500s against a mismatched schema while /api/health
# (a raw SELECT 1) stayed green. A failed deploy is recoverable; a silently
# broken one is not. For a schema-changing deploy on a rolling update: Stop the
# app in Coolify first, then Deploy.
echo "Checking for pending database migrations..."
if npx prisma migrate status > /tmp/migrate-status.txt 2>&1; then
    echo "Database schema is up to date - no migration needed."
else
    # Non-zero = migrations pending, or the check itself failed. Either way try
    # to apply; a real error is reported by migrate deploy below.
    cat /tmp/migrate-status.txt
    echo "Applying pending migrations..."
    MIGRATION_ATTEMPTS=${MIGRATION_ATTEMPTS:-12}
    MIGRATION_DELAY=${MIGRATION_DELAY:-5}
    migration_ok=0
    attempt=1
    while [ "$attempt" -le "$MIGRATION_ATTEMPTS" ]; do
        if npx prisma migrate deploy; then
            migration_ok=1
            break
        fi
        if [ "$attempt" -lt "$MIGRATION_ATTEMPTS" ]; then
            echo "Migration attempt $attempt/$MIGRATION_ATTEMPTS failed (database may be locked). Retrying in ${MIGRATION_DELAY}s..."
            sleep "$MIGRATION_DELAY"
        fi
        attempt=$((attempt + 1))
    done

    if [ "$migration_ok" -ne 1 ]; then
        echo '========================================'
        echo "FATAL: migrations failed after $MIGRATION_ATTEMPTS attempts."
        echo "If the errors above say 'database is locked', the OLD container is"
        echo 'still holding the database. Stop the app in Coolify, then Deploy.'
        echo 'Refusing to start the server against a mismatched schema.'
        echo '========================================'
        exit 1
    fi
fi

# Seed default categories (idempotent - skips if already exists)
echo "Checking seed data..."
npx tsx prisma/seed.ts || true

# Populate search shadow columns for any rows missing them.
# Required after the add_search_shadow_columns migration: it adds the columns as
# NULL on every existing row, and search matches nothing until they are filled.
# No-op once populated, so this is cheap on subsequent boots.
echo "Checking search index..."
npx tsx scripts/backfill-search-text.ts --missing-only || {
    echo "Search index backfill failed - search may return no results until 'npm run backfill:search' is run"
}

# Start the server
echo "Starting server on port 3001..."
exec tsx server/index.ts
