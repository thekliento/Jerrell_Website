#!/usr/bin/env bash
# Finalize: fast-forward main to dev, push, deploy live, verify live.
# One command from "the dev preview looks right" to "it is on pr0social.com".
set -euo pipefail
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SRC"

[ -z "$(git status --porcelain)" ] || { echo "commit your work on dev first:" >&2; git status --short >&2; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" = "dev" ] || { echo "run this from the dev branch" >&2; exit 1; }

python3 tools/scan_dashes.py

git checkout main
git merge --ff-only dev
git push origin main
"$SRC/tools/deploy.sh" live
sleep 20
"$SRC/tools/verify.sh" live
git checkout dev
git merge --ff-only main || true
echo
echo "promoted. back on dev, ready for the next change."
