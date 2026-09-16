#!/usr/bin/env bash
# Read the DEPLOYED site, not the repo. The repo is a claim; the URL is truth.
# Cache-busted, and it decodes Cloudflare's email obfuscation, which is how a
# stale klientohq@gmail.com hid in plain sight through a clean-looking curl.
set -uo pipefail
MODE="${1:-live}"
case "$MODE" in
  live) BASE="https://pr0social.com" ;;
  dev)  BASE="https://dev.pr0social.pages.dev" ;;
  *)    echo "usage: tools/verify.sh dev|live" >&2; exit 2 ;;
esac

PAGES=("" "about" "music" "videos" "gallery" "shows" "contact")
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
FAIL=0

echo "==> $BASE"
for p in "${PAGES[@]}"; do
  url="$BASE/$p?cb=$RANDOM$RANDOM"
  code=$(curl -sS -o "$TMP/${p:-index}.html" -w "%{http_code}" -H "Cache-Control: no-cache" "$url")
  [ "$code" = "200" ] || { echo "  FAIL ${p:-/} -> HTTP $code"; FAIL=1; continue; }
  echo "  ok   /${p} 200"
done

echo "==> emails actually served (obfuscation decoded)"
python3 - "$TMP" <<'PY'
import glob, os, re, sys
bad = 0
for f in sorted(glob.glob(os.path.join(sys.argv[1], "*.html"))):
    html = open(f, encoding="utf-8", errors="replace").read()
    found = set(re.findall(r'[\w.+-]+@[\w.-]+\.\w+', html))
    for m in re.findall(r'data-cfemail="([0-9a-f]+)"', html):
        k = int(m[:2], 16)
        found.add("".join(chr(int(m[i:i+2], 16) ^ k) for i in range(2, len(m), 2)))
    for e in sorted(found):
        flag = ""
        if "kliento" in e.lower() or "gmail" in e.lower():
            flag = "   <== WRONG, must be booking@pr0social.com"; bad = 1
        print("  %-14s %s%s" % (os.path.basename(f), e, flag))
sys.exit(bad)
PY
[ $? -eq 0 ] || FAIL=1

echo "==> redirects and TLS"
for chk in "http://pr0social.com" "https://www.pr0social.com"; do
  [ "$MODE" = "live" ] || break
  out=$(curl -sS -o /dev/null -w "%{http_code} -> %{redirect_url}" "$chk") || true
  echo "  $chk  $out"
done

echo "==> security headers"
curl -sSI "$BASE/?cb=$RANDOM" | grep -iE "strict-transport|content-security|x-content-type|referrer-policy|x-robots" | sed 's/^/  /'

echo
[ $FAIL -eq 0 ] && echo "VERIFY PASS" || { echo "VERIFY FAIL"; exit 1; }
