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
echo "Running database migrations..."
npx prisma migrate deploy || {
    echo "Migration failed (database may be locked). Retrying in 3 seconds..."
    sleep 3
    npx prisma migrate deploy || {
        echo "Migration failed again - starting server anyway (may have issues)"
    }
}

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
