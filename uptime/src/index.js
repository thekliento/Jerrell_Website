// Uptime monitor for pr0social.com.
//
// Deliberately stateless. There is no KV, no database and no third-party
// monitoring account, so there is nothing to expire, lose access to, or pay for.
// The cost of that choice is that a long outage alerts every 15 minutes rather
// than once. For a client site that is the right trade: you want to be told.
//
// It checks more than "did the server answer". A Cloudflare Pages site fails far
// more often by serving the WRONG thing (a half-finished deploy, a blank shell)
// than by serving nothing, so every probe also asserts a marker string that only
// a correctly rendered page contains.

import { EmailMessage } from "cloudflare:email";

const FROM = "form@pr0social.com";
const FROM_NAME = "Pr0 Social monitor";

const CHECKS = [
  { url: "https://pr0social.com/",        marker: "Pr0 Social" },
  { url: "https://pr0social.com/contact", marker: "booking@pr0social.com" },
];

const ATTEMPTS = 3;
const GAP_MS = 8000;
const TIMEOUT_MS = 10000;

async function probe(url, marker) {
  const t0 = Date.now();
  const ctl = new AbortController();
  const kill = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url + "?uptime=" + Date.now(), {
      signal: ctl.signal,
      cf: { cacheTtl: 0, cacheEverything: false },
      headers: { "cache-control": "no-cache", "user-agent": "pr0social-uptime/1" },
    });
    const body = await r.text();
    const ms = Date.now() - t0;
    if (!r.ok) return { ok: false, ms, why: "HTTP " + r.status };
    // Cloudflare rewrites addresses into a data-cfemail blob, so a marker that is
    // an email address will not appear literally. Accept either form.
    const seen = body.includes(marker) || (marker.includes("@") && body.includes("cfemail"));
    if (!seen) return { ok: false, ms, why: "200 but the page did not contain " + JSON.stringify(marker) };
    return { ok: true, ms, why: "200 in " + ms + "ms" };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, why: String(e && e.message || e) };
  } finally {
    clearTimeout(kill);
  }
}

async function runCheck(check) {
  const log = [];
  for (let i = 1; i <= ATTEMPTS; i++) {
    const r = await probe(check.url, check.marker);
    log.push("attempt " + i + ": " + r.why);
    if (r.ok) return { ok: true, log };
    if (i < ATTEMPTS) await new Promise((res) => setTimeout(res, GAP_MS));
  }
  return { ok: false, log };
}

async function mail(env, subject, body) {
  const msg = [
    "From: " + FROM_NAME + " <" + FROM + ">",
    "To: <" + env.ALERT_TO + ">",
    "Subject: " + subject,
    "Message-ID: <" + crypto.randomUUID() + "@pr0social.com>",
    "Date: " + new Date().toUTCString(),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "",
    body,
  ].join("\r\n");
  await env.ALERT.send(new EmailMessage(FROM, env.ALERT_TO, msg));
}

export default {
  async scheduled(event, env, ctx) {
    const monthly = event.cron === "0 13 1 * *";
    const results = [];
    for (const c of CHECKS) results.push({ url: c.url, ...(await runCheck(c)) });

    const down = results.filter((r) => !r.ok);
    const stamp = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

    if (down.length) {
      const body = [
        "pr0social.com failed " + ATTEMPTS + " checks in a row.",
        "",
        ...down.flatMap((r) => [r.url, ...r.log.map((l) => "  " + l), ""]),
        "Checked at " + stamp + " from the Cloudflare edge.",
        "",
        "First thing to try: tools/deploy.sh live, then tools/verify.sh live.",
      ].join("\n");
      ctx.waitUntil(mail(env, "DOWN: pr0social.com", body));
      return;
    }

    if (monthly) {
      const body = [
        "pr0social.com is up. Monthly check in from the uptime monitor.",
        "",
        ...results.map((r) => r.url + "  " + r.log[r.log.length - 1]),
        "",
        "Checked every 15 minutes from the Cloudflare edge. You only hear from",
        "this address when something is wrong, plus this note once a month so you",
        "know the monitor itself is alive.",
        "",
        stamp,
      ].join("\n");
      ctx.waitUntil(mail(env, "pr0social.com monthly: all good", body));
    }
  },
};
