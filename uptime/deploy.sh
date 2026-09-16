#!/usr/bin/env bash
# Deploy the uptime monitor. Cron-only Worker, no HTTP route, Workers free plan.
# 96 scheduled runs a day against a 100,000/day allowance. Bills nothing.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
export CLOUDFLARE_API_TOKEN="$(security find-generic-password -s kliento-cloudflare-admin -w)"
export CLOUDFLARE_ACCOUNT_ID="ccc25ce02918d3130bc0ae6b6af93bb8"
exec npx --yes wrangler@latest deploy "$@"
