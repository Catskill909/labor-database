#!/bin/sh

# Safety check: detect if /app/data volume is missing
if [ ! -f /app/data/dev.db ]; then
    echo '========================================'
    echo 'WARNING: No existing database found at /app/data/dev.db'
    echo 'A new database will be created.'
    echo '========================================'
fi

# ALWAYS run migrations - prisma migrate deploy only applies pending migrations
# This is safe and idempotent, and ensures schema changes reach production
#
# Retry generously: Coolify removes the old container and starts the new one
# within a few seconds ("rolling update is not supported" - ports are mapped to
# the host), but Docker allows a stopping container up to a 10s grace period and
# the server has no SIGTERM handler. The old process can therefore still hold
# /app/data/dev.db (SQLite, WAL mode) when this runs. A single 3s retry was not
# long enough, so migrations failed on every deploy - unnoticed until a deploy
# actually depended on one (25 Aug 2026 outage; see HANDOFF.md).
echo "Running database migrations..."
MIGRATION_ATTEMPTS=12
MIGRATION_DELAY=5
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

# Refuse to start on failure. Starting anyway is what turned a failed migration
# into an outage: the server came up against a schema it did not match and
# served 500s from every endpoint that touches Entry, while /api/health stayed
# green because it only runs a raw SELECT 1. A failed deploy is recoverable;
# a silently broken one is not.
if [ "$migration_ok" -ne 1 ]; then
    echo '========================================'
    echo "FATAL: migrations failed after $MIGRATION_ATTEMPTS attempts."
    echo 'Refusing to start the server - it would serve errors against a'
    echo 'mismatched schema. Fix the migration, then redeploy.'
    echo '========================================'
    exit 1
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
