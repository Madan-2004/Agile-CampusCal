// Date helpers + category metadata shared across the app.

// Must mirror backend/categories.py
export const CATEGORIES = {
  exam:       { label: "Exams & quizzes", short: "Exam",       color: "#e5484d" },
  assignment: { label: "Assignments",     short: "Assignment", color: "#f97316" },
  class:      { label: "Classes",         short: "Class",      color: "#3b82f6" },
  placement:  { label: "Placement",       short: "Placement",  color: "#6366f1" },
  workshop:   { label: "Workshops",       short: "Workshop",   color: "#10b981" },
  talk:       { label: "Talks & seminars",short: "Talk",       color: "#14b8a6" },
  club_event: { label: "Club events",     short: "Club",       color: "#a855f7" },
  admin:      { label: "Notices & admin", short: "Notice",     color: "#d97706" },
  other:      { label: "Other",           short: "Other",      color: "#8b8d98" },
};

export const catMeta = (c) => CATEGORIES[c] || CATEGORIES.other;

export const shortLabel = (l) => (l || "").replace("IIMA/", "");

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayISO = () => toISO(new Date());

export function monthMatrix(year, month) {
  // Weeks starting Monday. Returns array of {date: Date, inMonth: bool}.
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7)); // back to Monday
  const cells = [];
  const cur = new Date(start);
  do {
    cells.push({ date: new Date(cur), inMonth: cur.getMonth() === month });
    cur.setDate(cur.getDate() + 1);
  } while (cells.length < 42 && (cur.getMonth() === month || cells.length % 7 !== 0));
  return cells;
}

export function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const mer = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hh}:${String(m).padStart(2, "0")} ${mer}` : `${hh} ${mer}`;
}

export function fmtTimeRange(ev) {
  if (!ev.start_time) return "All day";
  return ev.end_time ? `${fmtTime(ev.start_time)} – ${fmtTime(ev.end_time)}` : fmtTime(ev.start_time);
}

export function fmtDateLong(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });
}

export function relDay(iso) {
  const t = todayISO();
  if (iso === t) return "Today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (iso === toISO(tomorrow)) return "Tomorrow";
  return fmtDateLong(iso);
}

export function fmtReceived(isoDateTime) {
  const d = new Date(isoDateTime);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay)
    return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const initials = (name) =>
  name.split(/\s+/).map((w) => w[0]).filter((ch) => /[A-Za-z]/.test(ch)).slice(0, 2).join("").toUpperCase();

// Deterministic pastel for sender avatars
export function avatarColor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 45%)`;
}
