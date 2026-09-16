#!/usr/bin/env bash
# Fire the cron handler ON CLOUDFLARE, with the real bindings, on demand.
# This is the only way to prove the monitor works without waiting 15 minutes
# and without faking an outage. A deploy that succeeds proves nothing about
# whether the handler runs.
#
#   uptime/test-remote.sh                    healthy path, expects no email
#   uptime/test-remote.sh "0 13 1 * *"       monthly heartbeat, SENDS one email
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
CRON="${1:-*/15 * * * *}"
PORT=8799

export CLOUDFLARE_API_TOKEN="$(security find-generic-password -s kliento-cloudflare-admin -w)"
export CLOUDFLARE_ACCOUNT_ID="ccc25ce02918d3130bc0ae6b6af93bb8"

npx --yes wrangler@latest dev --remote --test-scheduled --port "$PORT" --show-interactive-dev-session=false >/tmp/uptime-dev.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT

for i in $(seq 1 60); do
  curl -sf "http://127.0.0.1:$PORT/__scheduled" -o /dev/null 2>/dev/null && break
  sleep 2
done

echo "==> firing cron: $CRON"
curl -sS "http://127.0.0.1:$PORT/__scheduled?cron=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$CRON")"
echo
sleep 8
echo "==> worker log"
cat /tmp/uptime-dev.log
