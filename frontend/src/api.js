// Thin API client. Vite dev server proxies /api → FastAPI on :8000.

async function req(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  emails: () => req("/api/emails"),
  markRead: (id) => req(`/api/emails/${id}/read`, { method: "POST" }),
  extract: (id) => req(`/api/emails/${id}/extract`, { method: "POST" }),
  parse: (body) => req("/api/parse", { method: "POST", body: JSON.stringify(body) }),
  gmailSync: (mails) => req("/api/gmail/sync", { method: "POST", body: JSON.stringify({ mails }) }),
  taxonomy: () => req("/api/taxonomy"),
  classify: (items) => req("/api/classify", { method: "POST", body: JSON.stringify({ items }) }),
  setGcalRef: (id, gcal_event_id) =>
    req(`/api/events/${id}/gcal`, { method: "PATCH", body: JSON.stringify({ gcal_event_id }) }),
  events: () => req("/api/events"),
  createEvent: (body) =>
    req("/api/events", { method: "POST", body: JSON.stringify(body) }),
  deleteEvent: (id) => req(`/api/events/${id}`, { method: "DELETE" }),
  simulateMail: () => req("/api/simulate/new-email", { method: "POST" }),
};
