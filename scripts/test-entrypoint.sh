#!/bin/sh
# Tests docker-entrypoint.sh without Docker or a database: `npx` and `tsx` are
# replaced by stand-ins that record what was called and answer as scripted.
#   sh scripts/test-entrypoint.sh            (or: npm run test:entrypoint)
#   sh scripts/test-entrypoint.sh <file>     test another copy of the script
#
# Case A is the class that broke every Labor Landmarks deploy (25 Oct 2026) and
# caused this app's 25 Aug outage: `prisma migrate deploy` must NOT run when no
# migration is pending, because the old container still holds the SQLite lock.
set -u
SCRIPT=${1:-"$(dirname "$0")/../docker-entrypoint.sh"}
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
F=0

# Stand-in for npx: `prisma migrate status` exits $STATUS_RC; `prisma migrate
# deploy` fails until call number $DEPLOY_OK_ON (0 = always fails); seed and
# backfill succeed. Every call is logged.
cat > "$T/npx" <<'EOF'
#!/bin/sh
echo "npx $*" >> "$LOG"
case "$*" in
  "prisma migrate status") exit "$STATUS_RC" ;;
  "prisma migrate deploy")
    n=$(($(cat "$CNT" 2>/dev/null || echo 0) + 1)); echo "$n" > "$CNT"
    [ "$DEPLOY_OK_ON" -ne 0 ] && [ "$n" -ge "$DEPLOY_OK_ON" ] && exit 0; exit 1 ;;
  *) exit 0 ;;
esac
EOF
printf '#!/bin/sh\necho "SERVER STARTED" >> "$LOG"\n' > "$T/tsx"
chmod +x "$T/npx" "$T/tsx"

run() { # name status_rc deploy_ok_on -> sets RC, DEPLOYS, STARTED
  LOG="$T/$1.log"; CNT="$T/$1.cnt"; : > "$LOG"
  LOG=$LOG CNT=$CNT STATUS_RC=$2 DEPLOY_OK_ON=$3 MIGRATION_ATTEMPTS=4 MIGRATION_DELAY=0 \
    PATH="$T:$PATH" sh "$SCRIPT" > "$T/$1.out" 2>&1
  RC=$?
  DEPLOYS=$(grep -c "prisma migrate deploy" "$LOG")
  STARTED=$(grep -c "SERVER STARTED" "$LOG")
}
check() { if [ "$2" = "$3" ]; then echo "  ok    $1"; else echo "  FAIL  $1: got '$2' want '$3'"; F=$((F+1)); fi; }

echo "A: nothing pending"
run a 0 1
check "migrate deploy never runs" "$DEPLOYS" 0
check "server starts" "$STARTED" 1

echo "B: pending, database locked twice, then free"
run b 1 3
check "migrate deploy retried until it worked" "$DEPLOYS" 3
check "server starts" "$STARTED" 1

echo "C: pending, migration keeps failing"
run c 1 0
check "gives up after MIGRATION_ATTEMPTS" "$DEPLOYS" 4
check "server does NOT start" "$STARTED" 0
check "exits with an error" "$([ "$RC" -ne 0 ] && echo nonzero || echo zero)" nonzero

echo; [ "$F" = 0 ] && echo "all passed" || { echo "FAILED: $F"; exit 1; }
