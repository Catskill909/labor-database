#!/bin/bash
# Labor Database — Local Dev Startup
# Kills any existing dev servers, then starts fresh

echo "Labor Database Dev Server"
echo "------------------------------"

# Kill any existing processes on our ports (SIGKILL to handle suspended processes)
for PORT in 3001 5173 5174; do
    PIDS=$(lsof -ti :$PORT 2>/dev/null)
    if [ -n "$PIDS" ]; then
        echo "Killing process on port $PORT (PID: $PIDS)"
        echo "$PIDS" | xargs kill -9 2>/dev/null
    fi
done
sleep 1

# Verify ports are free
for PORT in 3001 5173 5174; do
    if lsof -ti :$PORT >/dev/null 2>&1; then
        echo "Port $PORT still in use — cannot start"
        exit 1
    fi
done
echo "All ports free"

# Ensure Prisma client is up to date with schema
echo "Syncing Prisma client..."
npx prisma generate --no-hints 2>/dev/null

# Ensure uploads directory exists
mkdir -p uploads/entries

echo "Starting Vite + Express..."
echo "------------------------------"

# Start both servers — use trap to clean up on exit (Ctrl+C kills both)
trap 'kill 0; exit' SIGINT SIGTERM

npm run dev &
npm run server &

wait
