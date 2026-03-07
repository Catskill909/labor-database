#!/bin/sh

# Safety check: detect if /app/data volume is missing
if [ ! -f /app/data/dev.db ]; then
    echo '========================================'
    echo 'WARNING: No existing database found at /app/data/dev.db'
    echo 'Running initial migration...'
    echo '========================================'
    npx prisma migrate deploy || true
    npx tsx prisma/seed.ts || true
else
    echo "Existing database found - skipping migrations (already applied)"
fi

# Just start the server - migrations are already done
echo "Starting server on port 3001..."
exec tsx server/index.ts
