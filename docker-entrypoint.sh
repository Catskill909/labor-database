#!/bin/sh
set -e

# Safety check: detect if /app/data volume is missing
if [ ! -f /app/data/dev.db ]; then
    echo '========================================'
    echo 'WARNING: No existing database found at /app/data/dev.db'
    echo 'If this is production, a persistent volume MUST be mounted at /app/data'
    echo 'Without it, ALL DATA IS LOST on every deploy!'
    echo '========================================'
else
    echo "Existing database found at /app/data/dev.db"
fi

# Use flock to ensure only ONE process runs migrations at a time
# This prevents "database is locked" errors during rolling deployments
echo "Acquiring migration lock..."
flock -x -w 60 /app/data/migrate.lock sh -c '
    echo "Running migrations..."
    npx prisma migrate deploy
    echo "Running seed..."
    npx tsx prisma/seed.ts
    echo "Migrations complete."
'

echo "Starting server..."
exec tsx server/index.ts
