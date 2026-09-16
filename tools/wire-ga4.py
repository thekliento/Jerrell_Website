#!/usr/bin/env python3
"""Wire Google Analytics 4 into all eight pages, and open the CSP just enough.

    python3 tools/wire-ga4.py G-XXXXXXXXXX
    python3 tools/wire-ga4.py --remove

Cloudflare hosting does NOT block Google Analytics. The only thing that did was
this site's own Content-Security-Policy, which allows scripts from 'self' only.
This adds googletagmanager.com to script-src and the analytics collectors to
connect-src, and nothing else. ⛔ Do not widen it further.

GA4 runs ALONGSIDE Cloudflare Web Analytics on purpose. Roughly a third of music
listeners run an ad blocker, and every one of them blocks GA and none of them
block Cloudflare's first-party beacon. Two numbers that disagree is the point:
GA is the rich view, Cloudflare is the honest floor.

Anonymised IPs and no ad personalisation are set in the snippet. That is the
privacy floor, not a substitute for a consent banner if he ever chases EU press.
"""
import glob, io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

ANCHOR = '<script>document.documentElement.classList.add("js");</script>\n'
START = "<!-- ga4 -->"
END = "<!-- /ga4 -->"

SNIPPET = """{start}
<script async src="https://www.googletagmanager.com/gtag/js?id={mid}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{mid}',{{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false}});</script>
{end}
"""

CSP_OLD_SCRIPT = "script-src 'self' 'unsafe-inline';"
CSP_NEW_SCRIPT = "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;"
CSP_OLD_CONNECT = "connect-src 'self';"
CSP_NEW_CONNECT = ("connect-src 'self' https://www.google-analytics.com "
                   "https://*.google-analytics.com https://*.analytics.google.com "
                   "https://www.googletagmanager.com;")


def strip(s):
    return re.sub(re.escape(START) + r".*?" + re.escape(END) + r"\n?", "", s, flags=re.S)


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    arg = sys.argv[1]
    remove = arg == "--remove"
    if not remove and not re.fullmatch(r"G-[A-Z0-9]{6,12}", arg):
        raise SystemExit("that is not a GA4 measurement id. it looks like G-ABC1234XYZ")

    for p in sorted(glob.glob("*.html")):
        s = io.open(p, encoding="utf-8").read()
        s = strip(s)
        if not remove:
            if s.count(ANCHOR) != 1:
                raise SystemExit("!! %s: the anchor script is not unique" % p)
            s = s.replace(ANCHOR, ANCHOR + SNIPPET.format(mid=arg, start=START, end=END))
        io.open(p, "w", encoding="utf-8").write(s)
        print(("unwired " if remove else "wired   ") + p)

    h = io.open("_headers", encoding="utf-8").read()
    if remove:
        h = h.replace(CSP_NEW_SCRIPT, CSP_OLD_SCRIPT).replace(CSP_NEW_CONNECT, CSP_OLD_CONNECT)
    else:
        if CSP_OLD_SCRIPT in h:
            h = h.replace(CSP_OLD_SCRIPT, CSP_NEW_SCRIPT)
        if CSP_OLD_CONNECT in h:
            h = h.replace(CSP_OLD_CONNECT, CSP_NEW_CONNECT)
    io.open("_headers", "w", encoding="utf-8").write(h)
    print("csp     _headers")
    print("\nnext: tools/deploy.sh dev, check the browser console is clean, then tools/promote.sh")


if __name__ == "__main__":
    main()
