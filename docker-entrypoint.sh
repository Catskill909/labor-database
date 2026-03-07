#!/bin/sh

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

# Retry migration up to 5 times with exponential backoff
# This handles "database is locked" errors from concurrent containers
MAX_RETRIES=5
RETRY_DELAY=2

for i in $(seq 1 $MAX_RETRIES); do
    echo "Migration attempt $i of $MAX_RETRIES..."
    if npx prisma migrate deploy 2>&1; then
        echo "Migration successful!"
        break
    else
        if [ $i -eq $MAX_RETRIES ]; then
            echo "Migration failed after $MAX_RETRIES attempts, starting server anyway..."
        else
            echo "Migration failed, retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
            RETRY_DELAY=$((RETRY_DELAY * 2))
        fi
    fi
done

# Seed is idempotent, run it
npx tsx prisma/seed.ts 2>/dev/null || true

echo "Starting server..."
exec tsx server/index.ts
