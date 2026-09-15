// Booking form backend for pr0social.com.
// The form on /contact posts JSON here; this turns it into an email and sends it
// through Cloudflare Email Routing to the verified destination. No third party,
// no account, no bill. Route: pr0social.com/api/booking

import { EmailMessage } from "cloudflare:email";

const FROM = "form@pr0social.com";
const FROM_NAME = "Pr0 Social site";
const MAX = { name: 120, email: 160, type: 60, date: 40, venue: 200, message: 4000 };

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// RFC 5322 rejects bare CR or LF in a header, and an injected one would let a
// sender forge extra headers. Strip them, then clamp the length.
const clean = (v, max) =>
  String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);

const encodeHeader = (v) =>
  // eslint-disable-next-line no-control-regex
  /^[\x20-\x7E]*$/.test(v) ? v : `=?UTF-8?B?${btoa(unescape(encodeURIComponent(v)))}?=`;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    if (request.method !== "POST") return json(405, { error: "Use POST." });

    let d;
    try {
      d = await request.json();
    } catch {
      return json(400, { error: "Expected JSON." });
    }

    // Honeypot. A bot filled a field no person can see, so accept and drop it.
    if (d._gotcha) return json(200, { ok: true });

    const name = clean(d.name, MAX.name);
    const email = clean(d.email, MAX.email);
    const message = String(d.message ?? "").trim().slice(0, MAX.message);
    if (!name || !email || !message) return json(400, { error: "Missing a required field." });
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return json(400, { error: "That email does not look right." });

    const type = clean(d.type, MAX.type) || "Inquiry";
    const date = clean(d.date, MAX.date) || "not specified";
    const venue = clean(d.venue, MAX.venue) || "not specified";

    const subject = encodeHeader(`${type} from ${name}`);
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Inquiry: ${type}`,
      `Event date: ${date}`,
      `Venue / location: ${venue}`,
      "",
      message,
      "",
      "---",
      "Sent from the booking form on pr0social.com. Reply goes straight to them.",
    ].join("\r\n");

    const raw = [
      `From: ${encodeHeader(FROM_NAME)} <${FROM}>`,
      `To: <${env.BOOKING_TO}>`,
      `Reply-To: ${encodeHeader(name)} <${email}>`,
      `Subject: ${subject}`,
      `Message-ID: <${crypto.randomUUID()}@pr0social.com>`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      body,
    ].join("\r\n");

    try {
      await env.BOOKING.send(new EmailMessage(FROM, env.BOOKING_TO, raw));
    } catch (err) {
      // The address is almost certainly not verified on Email Routing yet.
      console.error("booking send failed:", err?.message || err);
      return json(502, { error: "Could not send right now." });
    }

    return json(200, { ok: true });
  },
};
