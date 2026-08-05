// Real Gmail integration via Google Identity Services (runs fully in the
// browser — no client secret needed, read-only scope, token lives in memory).
import { GMAIL_MAX_MESSAGES, GMAIL_CONCURRENCY } from "./config";

/** Runs an async mapper over items with a bounded number in flight. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i]);
      } catch {
        out[i] = null;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return out;
}

// NOTE: creating a *new* calendar needs the full `calendar` scope —
// `calendar.events` alone can only write events into calendars that already
// exist (that combination returns 403 on calendars.insert).
const SCOPES =
  "https://www.googleapis.com/auth/gmail.readonly " +
  "https://www.googleapis.com/auth/calendar " +
  "https://www.googleapis.com/auth/calendar.events " +
  "https://www.googleapis.com/auth/userinfo.profile " +
  "https://www.googleapis.com/auth/userinfo.email";

let gisReady = null;

export function loadGis() {
  if (gisReady) return gisReady;
  gisReady = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Google sign-in (are you online?)"));
    document.head.appendChild(s);
  });
  return gisReady;
}

export async function signIn(clientId) {
  await loadGis();
  const token = await new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp) =>
        resp.access_token ? resolve(resp.access_token) : reject(new Error(resp.error || "Sign-in cancelled")),
      error_callback: (err) => reject(new Error(err?.message || "Sign-in cancelled")),
    });
    client.requestAccessToken();
  });

  const profile = await gFetch("https://www.googleapis.com/oauth2/v3/userinfo", token);
  return { token, profile }; // profile: { name, email, picture, ... }
}

export function signOut(token) {
  try {
    window.google?.accounts?.oauth2?.revoke(token, () => {});
  } catch {
    /* token simply expires */
  }
}

async function gFetch(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    let reason = "";
    try {
      const err = await res.json();
      reason = err.error?.status || err.error?.message || "";
    } catch { /* no body */ }
    if (res.status === 403 && /SERVICE_DISABLED|has not been used/i.test(reason))
      throw new Error("API_DISABLED");
    if (res.status === 403)
      throw new Error("NO_PERMISSION");
    throw new Error(`Google API ${res.status}`);
  }
  return res.json();
}

// ---- message fetching & decoding ----

function b64urlDecode(data) {
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

function findPart(payload, mime) {
  if (!payload) return null;
  if (payload.mimeType === mime && payload.body?.data) return payload.body.data;
  for (const p of payload.parts || []) {
    const found = findPart(p, mime);
    if (found) return found;
  }
  return null;
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

function header(msg, name) {
  return msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

// Gmail returns label IDs; we need their names (e.g. "IIMA/Exam Notices").
let LABEL_NAMES = null;

export async function fetchLabelMap(token) {
  if (LABEL_NAMES) return LABEL_NAMES;
  try {
    const res = await gFetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", token);
    LABEL_NAMES = {};
    for (const l of res.labels || []) LABEL_NAMES[l.id] = l.name;
  } catch {
    LABEL_NAMES = {};
  }
  return LABEL_NAMES;
}

export async function fetchInbox(token, pageToken = null) {
  const labelMap = await fetchLabelMap(token);
  let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${GMAIL_MAX_MESSAGES}&labelIds=INBOX`;
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
  const list = await gFetch(url, token);
  const ids = (list.messages || []).map((m) => m.id);

  const mails = await mapLimit(ids, GMAIL_CONCURRENCY, async (id) => {
      try {
        const msg = await gFetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
          token
        );
        const from = header(msg, "From"); // e.g. `PGP Office <pgp@iima.ac.in>`
        const m = from.match(/^\s*"?([^"<]*)"?\s*<(.+)>\s*$/);
        const senderName = (m ? m[1].trim() : from.split("@")[0]) || from;
        const senderEmail = m ? m[2].trim() : from;

        let body = "";
        const plain = findPart(msg.payload, "text/plain");
        if (plain) body = b64urlDecode(plain);
        else {
          const html = findPart(msg.payload, "text/html");
          body = html ? stripHtml(b64urlDecode(html)) : msg.snippet || "";
        }

        const dateHdr = header(msg, "Date");
        const received = dateHdr ? new Date(dateHdr) : new Date(Number(msg.internalDate));

        // User labels already applied by the student's own Gmail filters —
        // tier 1 of classification.
        const labels = (msg.labelIds || [])
          .map((id) => labelMap[id])
          .filter((n) => n && n.startsWith("IIMA/"));

        return {
          id: `g_${msg.id}`,
          gmail: true,
          gmail_id: msg.id,
          sender_name: senderName,
          sender_email: senderEmail,
          to: header(msg, "To"),
          cc: header(msg, "Cc"),
          labels,
          subject: header(msg, "Subject") || "(no subject)",
          snippet: (msg.snippet || "").slice(0, 120),
          body: body.trim(),
          received_at: isNaN(received) ? new Date().toISOString() : received.toISOString(),
          is_official: /@iima\.ac\.in$/i.test(senderEmail),
          read: !(msg.labelIds || []).includes("UNREAD"),
          event_ids: [],
          personal_event_ids: [],
          shared_event_ids: [],
        };
      } catch {
        return null;
      }
  });

  return { mails: mails.filter(Boolean), nextPageToken: list.nextPageToken || null };
}

// ---- Google Calendar: read all calendars (incl. class-schedule ones) ----

const CLASSY_CAL = /class|schedule|time.?table|course|term|academic|section/i;

export async function fetchCalendarEvents(token) {
  const calList = await gFetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50",
    token
  );
  const now = new Date();
  const timeMin = new Date(now.getTime() - 7 * 864e5).toISOString();
  const timeMax = new Date(now.getTime() + 60 * 864e5).toISOString();

  const all = await Promise.all(
    (calList.items || []).map(async (cal) => {
      try {
        const res = await gFetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events` +
            `?singleEvents=true&orderBy=startTime&maxResults=100` +
            `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
          token
        );
        const isClassCal = CLASSY_CAL.test(cal.summary || "");
        return (res.items || [])
          .filter((ev) => ev.status !== "cancelled" && (ev.start?.dateTime || ev.start?.date))
          .filter((ev) => !ev.extendedProperties?.private?.campuscal) // skip our own pushes
          .map((ev) => {
            const startDT = ev.start.dateTime || null;
            const date = startDT ? startDT.slice(0, 10) : ev.start.date;
            return {
              id: `gc_${ev.id}`,
              gcal: true,
              calendar: cal.summary || "Google Calendar",
              isClassCal,
              description: ev.description || "",
              title: ev.summary || "(untitled)",
              category: isClassCal ? "class" : "other",
              date,
              start_time: startDT ? startDT.slice(11, 16) : null,
              end_time: ev.end?.dateTime ? ev.end.dateTime.slice(11, 16) : null,
              venue: ev.location || null,
              layer: "personal",
              confidence: 1,
              source_email_id: null,
              external_ref: null,
              source_label: "Google Calendar",
              links: [],
              source_sender: null,
            };
          });
      } catch {
        return [];
      }
    })
  );
  return all.flat();
}

// ---- pushing CampusCal events INTO Google Calendar ----

const TZ = "Asia/Kolkata";
const CAL_NAME = "CampusCal — IIMA";
const CAL_KEY = "campuscal_calendar_id";

function timeBlock(ev) {
  if (!ev.start_time) return { start: { date: ev.date }, end: { date: ev.date } };
  const s = `${ev.date}T${ev.start_time}:00`;
  let e;
  if (ev.end_time && ev.end_time > ev.start_time) {
    e = `${ev.date}T${ev.end_time}:00`;
  } else {
    const [h, m] = ev.start_time.split(":").map(Number);
    const p = (n) => String(n).padStart(2, "0");
    e = `${ev.date}T${p((h + 1) % 24)}:${p(m)}:00`;
  }
  return { start: { dateTime: s, timeZone: TZ }, end: { dateTime: e, timeZone: TZ } };
}

function describe(ev) {
  const lines = [];
  if (ev.source_label) lines.push(`Source: ${ev.source_label}`);
  for (const l of ev.links || []) lines.push(`${l.label}: ${l.url}`);
  lines.push("", "Added by CampusCal — parsed automatically from campus email.");
  return lines.join("\n");
}

function eventBody(ev) {
  return {
    summary: ev.title,
    location: ev.venue || undefined,
    description: describe(ev),
    ...timeBlock(ev),
    extendedProperties: { private: { campuscal: "1", campuscal_id: String(ev.id) } },
  };
}

/**
 * Finds (or creates once) the dedicated "CampusCal — IIMA" calendar.
 * If the granted token isn't allowed to create calendars (403 — happens when
 * the user signed in before the full `calendar` scope was requested), we fall
 * back to the primary calendar rather than failing the whole push. Events are
 * tagged either way, so dedupe and "remove pushed events" still work.
 */
export async function ensureCampusCalendar(token) {
  const cached = localStorage.getItem(CAL_KEY);
  if (cached) {
    try {
      await gFetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cached)}`,
        token
      );
      return { id: cached, dedicated: true };
    } catch {
      localStorage.removeItem(CAL_KEY); // deleted on Google's side
    }
  }

  try {
    const list = await gFetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=100",
      token
    );
    const found = (list.items || []).find((c) => c.summary === CAL_NAME);
    if (found) {
      localStorage.setItem(CAL_KEY, found.id);
      return { id: found.id, dedicated: true };
    }
  } catch {
    /* can't list calendars — try creating anyway */
  }

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ summary: CAL_NAME, timeZone: TZ }),
  });

  if (res.ok) {
    const cal = await res.json();
    localStorage.setItem(CAL_KEY, cal.id);
    return { id: cal.id, dedicated: true };
  }

  if (res.status === 403 || res.status === 401) {
    return { id: "primary", dedicated: false }; // graceful fallback
  }
  throw new Error(`Could not create calendar (${res.status})`);
}

/** Map of campuscal_id → google event id for everything we've pushed before. */
export async function fetchPushedMap(token, calendarId) {
  const map = {};
  let pageToken = null;
  do {
    let url =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
      `?maxResults=250&showDeleted=false&privateExtendedProperty=${encodeURIComponent("campuscal=1")}`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    const res = await gFetch(url, token);
    for (const ev of res.items || []) {
      const cid = ev.extendedProperties?.private?.campuscal_id;
      if (cid) map[cid] = ev.id;
    }
    pageToken = res.nextPageToken || null;
  } while (pageToken);
  return map;
}

async function writeEvent(token, calendarId, ev, existingId) {
  const url = existingId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existingId}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const res = await fetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(eventBody(ev)),
  });
  if (res.status === 403 || res.status === 429) {
    await new Promise((r) => setTimeout(r, 1200)); // rate limited → one retry
    return writeEvent(token, calendarId, ev, existingId);
  }
  if (!res.ok) throw new Error(`Google Calendar ${res.status}`);
  return res.json();
}

/**
 * Pushes many events at once. Idempotent: events already pushed are updated,
 * never duplicated. onProgress(done, total) drives the progress bar.
 */
export async function pushEvents(token, events, onProgress) {
  const { id: calendarId, dedicated } = await ensureCampusCalendar(token);
  let pushed = {};
  try {
    pushed = await fetchPushedMap(token, calendarId);
  } catch {
    pushed = {}; // can't read back — worst case we add rather than update
  }

  let added = 0, updated = 0, failed = 0, done = 0;
  const results = [];
  const queue = [...events];
  const CONCURRENCY = 4;

  async function worker() {
    while (queue.length) {
      const ev = queue.shift();
      try {
        const existing = pushed[String(ev.id)];
        const saved = await writeEvent(token, calendarId, ev, existing);
        existing ? updated++ : added++;
        results.push({ id: ev.id, gcal_event_id: saved.id });
      } catch {
        failed++;
      } finally {
        done++;
        onProgress?.(done, events.length);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, events.length) }, worker));
  return { added, updated, failed, calendarId, dedicated, results };
}

/** Deletes every event CampusCal has pushed — makes the demo repeatable.
 *  Checks both the dedicated calendar and primary (in case of fallback). */
export async function removePushedEvents(token) {
  const targets = ["primary"];
  const cached = localStorage.getItem(CAL_KEY);
  if (cached) targets.unshift(cached);

  let removed = 0;
  for (const calendarId of targets) {
    let pushed = {};
    try {
      pushed = await fetchPushedMap(token, calendarId);
    } catch {
      continue;
    }
    for (const id of Object.values(pushed)) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok || res.status === 410) removed++;
    }
  }
  return { removed };
}

/** Single-event push (used by the Add-to-calendar checkbox). */
export async function insertCalendarEvent(token, ev) {
  const { id: calendarId } = await ensureCampusCalendar(token);
  return writeEvent(token, calendarId, ev, null);
}
