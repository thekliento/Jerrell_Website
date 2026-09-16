# The dev to live loop

Cloudflare Pages here is **Direct Upload**: pushing to GitHub does NOT publish.
Nothing reaches `pr0social.com` except `tools/deploy.sh live`.

| | |
|---|---|
| `main` | what is live. Only `promote.sh` moves it. |
| `dev` | where work happens. Default branch to sit on. |
| local | `preview_start {name:"epk"}`, http://localhost:4321 |
| dev preview | https://dev.pr0social.pages.dev |
| live | https://pr0social.com |

## The loop

```bash
cd "/Users/camilorivas/Documents/AI/@# Websites/@# Jerrell-Website"
git checkout dev          # work here

# 1. see it locally           http://localhost:4321
# 2. see it on a real URL, on your phone, on his phone
tools/deploy.sh dev
tools/verify.sh dev

# 3. happy? one command ships it
git add -A && git commit -m "what changed"
tools/promote.sh
```

`promote.sh` scans for em dashes, fast-forwards `main` to `dev`, pushes to GitHub,
deploys live, waits out the edge cache, re-reads all 7 public pages and prints
every email address the live HTML actually serves.

## Guard rails baked in

- `deploy.sh live` refuses to run off `main` or with uncommitted changes.
- `deploy.sh live` ships a clean `git archive` of HEAD, so `Presentation/`
  (internal pricing, public repo) and the gitignored originals can never leak.
- `tools/`, `worker/` and `Presentation/` are stripped from every upload.
- `verify.sh` decodes Cloudflare's `data-cfemail` obfuscation. A plain `curl`
  cannot see the email on the page, which is exactly how a stale
  `klientohq@gmail.com` sat live for a day looking fine.

## One thing the dev preview cannot do

The booking form posts to `/api/booking`, which is the `pr0social-booking` Worker
bound to a route on **pr0social.com only**. On `dev.pr0social.pages.dev` that path
404s. That is expected. Test the form on live, never on dev.

Cloudflare stamps `X-Robots-Tag: noindex` on the dev preview itself, so it can
never outrank the real site in search. Verified 2026-09-16.
