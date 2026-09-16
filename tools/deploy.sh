#!/usr/bin/env bash
# Pr0 Social EPK deploy.
#   tools/deploy.sh dev    preview the current working tree at dev.pr0social.pages.dev
#   tools/deploy.sh live   ship main to pr0social.com
# Cloudflare Pages is Direct Upload: a git push does NOT deploy. This script does.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACCOUNT="ccc25ce02918d3130bc0ae6b6af93bb8"
PROJECT="pr0social"
MODE="${1:-}"

case "$MODE" in
  dev|live) ;;
  *) echo "usage: tools/deploy.sh dev|live" >&2; exit 2 ;;
esac

cd "$SRC"
DIST="$(mktemp -d)"
trap 'rm -rf "$DIST"' EXIT

if [ "$MODE" = "live" ]; then
  BRANCH_ARG="main"
  [ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || { echo "live deploys run from main. you are on $(git rev-parse --abbrev-ref HEAD)" >&2; exit 1; }
  [ -z "$(git status --porcelain)" ] || { echo "uncommitted changes. commit them before a live deploy:" >&2; git status --short >&2; exit 1; }
  # a clean archive of HEAD, never the working folder: that is what keeps
  # Presentation/ and the gitignored originals off the public site
  git archive HEAD | tar -x -C "$DIST"
else
  BRANCH_ARG="dev"
  # tracked + untracked-but-not-ignored, so uncommitted work is previewable
  git ls-files -c -o --exclude-standard -z | while IFS= read -r -d '' f; do
    mkdir -p "$DIST/$(dirname "$f")"
    cp "$f" "$DIST/$f"
  done
fi

rm -rf "$DIST/AGENTS.md" "$DIST/.gitignore" "$DIST/tools" "$DIST/worker" "$DIST/Presentation"

echo "==> deploying $(find "$DIST" -type f | wc -l | tr -d ' ') files to Pages branch '$BRANCH_ARG'"
CLOUDFLARE_API_TOKEN="$(security find-generic-password -s kliento-cloudflare-token -w)" \
CLOUDFLARE_ACCOUNT_ID="$ACCOUNT" \
npx --yes wrangler@latest pages deploy "$DIST" \
  --project-name="$PROJECT" --branch="$BRANCH_ARG" --commit-dirty=true

echo
if [ "$MODE" = "live" ]; then
  echo "live: https://pr0social.com/   (edge may serve stale for ~60s)"
  echo "verify: tools/verify.sh live"
else
  echo "dev:  https://dev.$PROJECT.pages.dev/"
  echo "verify: tools/verify.sh dev"
fi
