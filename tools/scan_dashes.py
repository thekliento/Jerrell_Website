#!/usr/bin/env python3
"""Em and en dashes never ship. grep cannot see them in this shell; python can."""
import glob, io, sys
hits = []
for p in glob.glob("*.html") + glob.glob("css/*.css") + glob.glob("js/*.js"):
    for i, l in enumerate(io.open(p, encoding="utf-8").read().splitlines(), 1):
        if "—" in l or "–" in l:
            hits.append("%s:%d  %s" % (p, i, l.strip()[:110]))
if hits:
    print("DASHES FOUND, not shipping:"); [print("  " + h) for h in hits]; sys.exit(1)
print("dash scan clean")
