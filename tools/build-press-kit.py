#!/usr/bin/env python3
"""Build the downloadable press kit.

The deck sells "hi-res photos, artwork and bio stay current and downloadable, so
press never emails you for a picture". This is that file. Rebuild it whenever a
photo or a fact changes; it is committed, because deploy.sh ships a clean
git archive and an uncommitted zip would deploy as a broken link.

    python3 tools/build-press-kit.py
"""
import glob, io, os, zipfile
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets/press/pr0-social-press-kit.zip")

BIO = """PR0 SOCIAL
Jerrell Lanos. Rapper, singer and DJ. Buffalo, New York.

SHORT BIO, 40 words
Pr0 Social is Jerrell Lanos, a Buffalo rapper, singer and DJ making
contemporary R&B with rap lyricism. Six projects since 2018, more than 300,000
streams, an NPR placement and a Town Ballroom headline.

LONG BIO, 120 words
Pr0 Social is Jerrell Lanos, a rapper, singer and DJ from Buffalo, New York,
releasing music since 2018. The name comes from a prosocial behaviour class at
Canisius. Six projects in, his contemporary R&B and rap lyricism has passed
300,000 streams across platforms, led by "chainsmoking" at over 152,000 plays
on Spotify alone.

In 2023 NPR used three songs from "Things I've Buried" in a podcast series about
a Buffalo cheerleading squad in the aftermath of the May 2022 Tops shooting. He
has a feature from Jae Skeese of Conway the Machine's label, has headlined Town
Ballroom, and has played Beau Fleuve, MiA Festival and Buffalo Porchfest. He has
toured Richmond, Boston, Toronto and Pennsylvania. His latest release, "some
don't make it here..", is an eight track EP from February 2025.

FACTS
Based            Buffalo, New York
Active since     2018
Releases         6 projects
Streams          300,000+ across platforms
Biggest track    chainsmoking, 152,379 Spotify plays
Press            NPR, three songs from "Things I've Buried" (2023)
Feature          Jae Skeese
Rooms played     Town Ballroom (headline), Beau Fleuve, MiA Festival,
                 Buffalo Porchfest 2025
Toured           Richmond, Boston, Toronto, Pennsylvania
Latest           "some don't make it here..", 8 track EP, February 2025

LISTEN
Spotify          open.spotify.com/artist/4GrmZ6RJ3gzy5oI4p4Z63U
Apple Music      music.apple.com/us/artist/pr0-social/1381566556
SoundCloud       soundcloud.com/pr0social
YouTube          youtube.com/channel/UC-7JeAdJZiXaNKRxtAwQQIw
Deezer           deezer.com/en/artist/56472262
Instagram        instagram.com/prettypr0social

BOOKING AND PRESS
booking@pr0social.com
pr0social.com

WHAT IS IN THIS FILE
photos/      16 press photographs, 2400px on the long edge, print resolution
logo/        the Pr0 Social wordmark, transparent PNG, and the square logo
BIO.txt      this file

USAGE
These photographs are cleared for editorial and promotional use covering
Pr0 Social: listings, posters, articles, festival programmes and social posts.
Credit "Pr0 Social" where a credit line is available. For anything else, or for
a different crop or format, write to booking@pr0social.com.

Updated {updated}
"""


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    photos = sorted(glob.glob(os.path.join(ROOT, "assets/img/photo-*.jpg")))
    if len(photos) < 10:
        raise SystemExit("only %d photos found, the originals folder is missing" % len(photos))

    logos = [p for p in (
        os.path.join(ROOT, "assets/opt/logomark-dark.png"),
        os.path.join(ROOT, "assets/img/logo.jpg"),
    ) if os.path.exists(p)]

    # ZIP_STORED, not DEFLATE: these are JPEGs, deflate buys under 1% and costs
    # the browser a decompress on a 16 MB file.
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_STORED) as z:
        for p in photos:
            z.write(p, "Pr0 Social press kit/photos/" + os.path.basename(p))
        for p in logos:
            z.write(p, "Pr0 Social press kit/logo/" + os.path.basename(p))
        z.writestr("Pr0 Social press kit/BIO.txt",
                   BIO.format(updated=date.today().isoformat()))

    size = os.path.getsize(OUT)
    print("built %s" % os.path.relpath(OUT, ROOT))
    print("  %d photos, %d logo files, 1 bio" % (len(photos), len(logos)))
    print("  %.1f MB" % (size / 1048576))
    if size > 24 * 1048576:
        raise SystemExit("over the Cloudflare Pages 25 MB per-file limit")

    with zipfile.ZipFile(OUT) as z:
        bad = z.testzip()
        if bad:
            raise SystemExit("corrupt entry: " + bad)
        print("  archive verified, %d entries" % len(z.namelist()))


if __name__ == "__main__":
    main()
