import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { GOOGLE_CLIENT_ID } from "./config";
import {
  signIn, signOut, fetchInbox, fetchCalendarEvents, insertCalendarEvent,
  pushEvents, removePushedEvents,
} from "./gmail";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import MonthGrid from "./components/MonthGrid";
import AgendaPanel from "./components/AgendaPanel";
import Inbox from "./components/Inbox";
import ExtractModal from "./components/ExtractModal";
import EventModal from "./components/EventModal";
import PushModal from "./components/PushModal";
import { CATEGORIES } from "./utils";
import { CalendarIcon, InboxIcon, ListIcon, CheckIcon, SparklesIcon } from "./icons";

let toastId = 0;
const ALL_CATS = Object.keys(CATEGORIES);

export default function App() {
  const [view, setView] = useState("calendar"); // calendar | agenda | inbox
  const [theme, setTheme] = useState("light");
  const [cursor, setCursor] = useState(new Date());
  const [layer, setLayer] = useState("both");
  const [filters, setFilters] = useState(new Set(ALL_CATS));
  const [sourceFilters, setSourceFilters] = useState(new Set()); // empty = all
  const [showPush, setShowPush] = useState(false);
  const [pushProgress, setPushProgress] = useState({ done: 0, total: 0 });

  const [events, setEvents] = useState([]);
  const [emails, setEmails] = useState([]);
  const [gmail, setGmail] = useState(null); // { token, profile, mails }
  const [selectedMail, setSelectedMail] = useState(null);

  const [extractDraft, setExtractDraft] = useState(null); // {draft, email}
  const [detailEvent, setDetailEvent] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [popIds, setPopIds] = useState(new Set());
  const [busy, setBusy] = useState({ simulating: false, extracting: false, saving: false, signingIn: false });
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toast = useCallback((msg, icon = "check") => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, msg, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [evs, mails] = await Promise.all([api.events(), api.emails()]);
      setEvents(evs);
      setEmails(mails);
      setApiDown(false);
    } catch {
      setApiDown(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ------- derived -------
  // Signed in → the inbox is YOUR real Gmail only (demo mails hidden).
  const allEmails = useMemo(() => {
    const source = gmail ? gmail.mails : emails;
    return [...source].sort(
      (a, b) => new Date(b.received_at) - new Date(a.received_at)
    );
  }, [emails, gmail]);

  // Signed in → events synced from your Gmail + your Google Calendar
  // (class schedules etc.); demo mode → only demo events.
  const modeEvents = useMemo(() => {
    if (!gmail) return events.filter((e) => !e.external_ref);
    return [...events.filter((e) => e.external_ref), ...(gmail.gcalEvents || [])];
  }, [events, gmail]);

  const visibleEvents = useMemo(
    () =>
      modeEvents.filter(
        (e) =>
          filters.has(e.category) &&
          (layer === "both" || e.layer === layer) &&
          (sourceFilters.size === 0 || sourceFilters.has(e.source_label || "IIMA/Others"))
      ),
    [modeEvents, filters, layer, sourceFilters]
  );

  // Source labels actually present in the data, with counts.
  const sourceCounts = useMemo(() => {
    const c = {};
    for (const e of modeEvents) {
      const k = e.source_label || (e.gcal ? "Google Calendar" : "IIMA/Others");
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [modeEvents]);

  const eventDates = useMemo(() => new Set(visibleEvents.map((e) => e.date)), [visibleEvents]);

  const counts = useMemo(() => {
    const c = {};
    for (const e of modeEvents) c[e.category] = (c[e.category] || 0) + 1;
    return c;
  }, [modeEvents]);

  const unreadCount = allEmails.filter((m) => !m.read).length;

  // The personal event created from a given mail, if any (works for both
  // seeded mails — via source_email_id — and real Gmail mails — via external_ref).
  const personalEventFor = useCallback(
    (mail) => {
      if (!mail) return null;
      if (mail.gmail)
        return events.find((e) => e.layer === "personal" && e.external_ref === mail.gmail_id) || null;
      return events.find((e) => e.layer === "personal" && e.source_email_id === mail.id) || null;
    },
    [events]
  );

  const sharedEventFor = useCallback(
    (mail) => {
      if (!mail) return null;
      if (mail.gmail)
        return events.find((e) => e.layer === "shared" && e.external_ref === mail.gmail_id) || null;
      return events.find((e) => e.layer === "shared" && e.source_email_id === mail.id) || null;
    },
    [events]
  );

  // ------- filters -------
  const toggleFilter = (key) =>
    setFilters((f) => {
      const n = new Set(f);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const toggleAll = () =>
    setFilters((f) => (f.size === ALL_CATS.length ? new Set() : new Set(ALL_CATS)));

  const toggleSource = (key) =>
    setSourceFilters((f) => {
      const n = new Set(f);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const clearSources = () => setSourceFilters(new Set());

  // ------- mail -------
  const selectMail = async (id) => {
    setSelectedMail(id);
    const mail = allEmails.find((m) => m.id === id);
    if (mail && !mail.read) {
      if (mail.gmail) {
        setGmail((g) =>
          g ? { ...g, mails: g.mails.map((m) => (m.id === id ? { ...m, read: true } : m)) } : g
        );
      } else {
        setEmails((ms) => ms.map((m) => (m.id === id ? { ...m, read: true } : m)));
        api.markRead(id).catch(() => {});
      }
    }
  };

  const addToCalendar = async (mail) => {
    setBusy((b) => ({ ...b, extracting: true }));
    try {
      const draft = mail.gmail
        ? await api.parse({
            subject: mail.subject, body: mail.body, received_at: mail.received_at,
            sender: mail.sender_email, to: mail.to, cc: mail.cc, labels: mail.labels,
          })
        : await api.extract(mail.id);
      setExtractDraft({ draft, email: mail });
    } catch {
      toast("Could not reach the backend", "warn");
    } finally {
      setBusy((b) => ({ ...b, extracting: false }));
    }
  };

  const confirmEvent = async ({ pushToGoogle, ...body }) => {
    setBusy((b) => ({ ...b, saving: true }));
    try {
      const mail = extractDraft.email;
      const refs = mail.gmail
        ? { external_ref: mail.gmail_id }
        : { source_email_id: mail.id };
      const ev = await api.createEvent({
        ...body, ...refs,
        source_label: extractDraft.draft.source_label,
        links: extractDraft.draft.links,
      });
      setExtractDraft(null);
      await refresh();
      flashEvent(ev.id);
      setCursorToDate(ev.date);
      if (pushToGoogle && gmail) {
        try {
          await insertCalendarEvent(gmail.token, ev);
          toast(`Added "${ev.title}" — also pushed to your Google Calendar`, "spark");
        } catch {
          toast(`Added "${ev.title}" here, but Google Calendar push failed`, "warn");
        }
      } else {
        toast(`Added "${ev.title}" to your calendar`);
      }
    } catch {
      toast("Could not save the event", "warn");
    } finally {
      setBusy((b) => ({ ...b, saving: false }));
    }
  };

  const removeFromCalendar = async (mail) => {
    const ev = personalEventFor(mail);
    if (!ev) return;
    await api.deleteEvent(ev.id).catch(() => {});
    await refresh();
    toast(`Removed "${ev.title}" from your calendar`);
  };

  const deleteEvent = async (ev) => {
    await api.deleteEvent(ev.id).catch(() => {});
    setDetailEvent(null);
    refresh();
    toast("Event removed");
  };

  // Google Calendar events arrive with no category — run their titles through
  // the same backend classifier so they spread across the real categories
  // instead of piling up in "Other".
  const categoriseGcal = useCallback(async (evs) => {
    if (!evs.length) return evs;
    try {
      const { results } = await api.classify(
        evs.map((e) => ({
          id: e.id,
          title: e.title,
          text: `${e.venue || ""} ${e.description || ""}`.slice(0, 400),
        }))
      );
      const byId = Object.fromEntries(results.map((r) => [r.id, r]));
      return evs.map((e) => {
        const r = byId[e.id];
        if (!r) return e;
        // A calendar literally named "…class schedule" outranks keywords.
        if (e.isClassCal) return { ...e, category: "class" };
        return { ...e, category: r.scored ? r.category : "other" };
      });
    } catch {
      return evs;
    }
  }, []);

  // ------- gmail auth + auto-pipeline -------
  const syncMails = useCallback(
    async (mails) => {
      if (!mails.length) return;
      try {
        const res = await api.gmailSync(
          mails.map((m) => ({
            external_ref: m.gmail_id,
            subject: m.subject,
            body: m.body,
            received_at: m.received_at,
            sender: m.sender_email,
            to: m.to,
            cc: m.cc,
            labels: m.labels,
          }))
        );
        await refresh();
        const total = res.created_shared + res.created_personal;
        if (total > 0)
          toast(
            `Parsed your mail: ${res.created_shared} campus + ${res.created_personal} personal events added`,
            "spark"
          );
      } catch {
        toast("Could not sync events from Gmail", "warn");
      }
    },
    [refresh, toast]
  );

  const handleSignIn = async () => {
    if (!GOOGLE_CLIENT_ID) {
      toast("Add your Google Client ID in src/config.js first (see README)", "warn");
      return;
    }
    setBusy((b) => ({ ...b, signingIn: true }));
    try {
      const { token, profile } = await signIn(GOOGLE_CLIENT_ID);
      const { mails, nextPageToken } = await fetchInbox(token);
      let gcalEvents = [];
      try {
        gcalEvents = await fetchCalendarEvents(token);
        gcalEvents = await categoriseGcal(gcalEvents);
      } catch (e) {
        if (e.message === "API_DISABLED")
          toast("Enable the Google Calendar API in your Cloud project (APIs & Services → Library)", "warn");
        else if (e.message === "NO_PERMISSION")
          toast("Calendar access not granted — log out, sign in again, and tick ALL permission boxes", "warn");
        else toast("Signed in, but couldn't read Google Calendar", "warn");
      }
      setGmail({ token, profile, mails, nextPageToken, gcalEvents });
      setView("inbox");
      toast(
        `Signed in as ${profile.email} · ${mails.length} mails · ${gcalEvents.length} Google Calendar events`,
        "spark"
      );
      syncMails(mails);
    } catch (e) {
      toast(e.message || "Google sign-in failed", "warn");
    } finally {
      setBusy((b) => ({ ...b, signingIn: false }));
    }
  };

  // Live inbox watcher: while signed in, check for new mail every 45s and
  // run it through the auto-pipeline (production would use Gmail push instead).
  useEffect(() => {
    if (!gmail?.token) return;
    const timer = setInterval(async () => {
      try {
        const { mails } = await fetchInbox(gmail.token);
        const known = new Set(gmail.mails.map((m) => m.id));
        const fresh = mails.filter((m) => !known.has(m.id));
        if (fresh.length) {
          setGmail((g) => (g ? { ...g, mails: [...fresh, ...g.mails] } : g));
          toast(`${fresh.length} new mail${fresh.length > 1 ? "s" : ""} arrived — parsing…`, "spark");
          syncMails(fresh);
        }
      } catch {
        /* token expired or offline — sign in again to resume */
      }
    }, 45000);
    return () => clearInterval(timer);
  }, [gmail, syncMails, toast]);

  const loadMoreMails = async () => {
    if (!gmail?.nextPageToken || busy.loadingMore) return;
    setBusy((b) => ({ ...b, loadingMore: true }));
    try {
      const { mails, nextPageToken } = await fetchInbox(gmail.token, gmail.nextPageToken);
      setGmail((g) => (g ? { ...g, mails: [...g.mails, ...mails], nextPageToken } : g));
      syncMails(mails);
    } catch {
      toast("Could not load more mails", "warn");
    } finally {
      setBusy((b) => ({ ...b, loadingMore: false }));
    }
  };

  const handleSignOut = () => {
    if (gmail) signOut(gmail.token);
    setGmail(null);
    setSelectedMail(null);
    toast("Logged out of Gmail");
  };

  // ------- push everything to Google Calendar -------
  const runPush = async (selected) => {
    setBusy((b) => ({ ...b, pushing: true }));
    setPushProgress({ done: 0, total: selected.length });
    try {
      const res = await pushEvents(gmail.token, selected, (done, total) =>
        setPushProgress({ done, total })
      );
      // Remember Google's event ids so a later push updates instead of duplicating.
      await Promise.all(
        res.results.map((r) => api.setGcalRef(r.id, r.gcal_event_id).catch(() => {}))
      );
      await refresh();
      setShowPush(false);
      const bits = [`${res.added} added`];
      if (res.updated) bits.push(`${res.updated} updated`);
      if (res.failed) bits.push(`${res.failed} failed`);
      const where = res.dedicated ? "CampusCal — IIMA" : "your main calendar";
      toast(`${bits.join(" · ")} in ${where}`, "spark");
    } catch (e) {
      toast(e.message || "Push failed", "warn");
    } finally {
      setBusy((b) => ({ ...b, pushing: false }));
    }
  };

  const undoPush = async () => {
    if (!gmail) return;
    try {
      const { removed } = await removePushedEvents(gmail.token);
      toast(`Removed ${removed} pushed events from Google Calendar`);
    } catch {
      toast("Could not remove pushed events", "warn");
    }
  };

  // ------- demo -------
  const simulate = async () => {
    setBusy((b) => ({ ...b, simulating: true }));
    try {
      const res = await api.simulateMail();
      await refresh();
      if (res.events && res.events.length) {
        const ev = res.events[0];
        flashEvent(ev.id);
        setCursorToDate(ev.date);
        setView("calendar");
        toast(res.message, "spark");
      } else {
        toast(res.message, "spark");
      }
    } catch {
      toast("Could not reach the backend", "warn");
    } finally {
      setBusy((b) => ({ ...b, simulating: false }));
    }
  };

  const flashEvent = (id) => {
    setPopIds(new Set([id]));
    setTimeout(() => setPopIds(new Set()), 1600);
  };

  const setCursorToDate = (iso) => {
    const [y, m] = iso.split("-").map(Number);
    setCursor((c) =>
      c.getFullYear() === y && c.getMonth() === m - 1 ? c : new Date(y, m - 1, 1)
    );
  };

  const openSourceEmail = (emailId) => {
    setDetailEvent(null);
    setView("inbox");
    selectMail(emailId);
  };

  // ------- render -------
  return (
    <div className="app">
      <Sidebar
        view={view}
        setView={setView}
        cursor={cursor}
        setCursor={setCursor}
        filters={filters}
        toggleFilter={toggleFilter}
        toggleAll={toggleAll}
        sourceFilters={sourceFilters}
        toggleSource={toggleSource}
        clearSources={clearSources}
        sourceCounts={sourceCounts}
        eventDates={eventDates}
        counts={counts}
        unreadCount={unreadCount}
      />

      <div className="main">
        <TopBar
          view={view}
          cursor={cursor}
          setCursor={setCursor}
          layer={layer}
          setLayer={setLayer}
          onSimulate={simulate}
          simulating={busy.simulating}
          theme={theme}
          setTheme={setTheme}
          gmail={gmail}
          signingIn={busy.signingIn}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onPush={() => setShowPush(true)}
          onUndoPush={undoPush}
        />

        <div className="content">
          {view === "calendar" && (
            <>
              <MonthGrid
                cursor={cursor}
                events={visibleEvents}
                onEventClick={setDetailEvent}
                popIds={popIds}
              />
              <AgendaPanel events={visibleEvents} onEventClick={setDetailEvent} />
            </>
          )}

          {view === "agenda" && (
            <AgendaPanel events={visibleEvents} onEventClick={setDetailEvent} force />
          )}

          {view === "inbox" && (
            <Inbox
              emails={allEmails}
              selected={selectedMail}
              onSelect={selectMail}
              onBack={() => setSelectedMail(null)}
              onAddToCalendar={addToCalendar}
              onRemoveFromCalendar={removeFromCalendar}
              extracting={busy.extracting}
              personalEventFor={personalEventFor}
              sharedEventFor={sharedEventFor}
              hasMore={!!gmail?.nextPageToken}
              loadingMore={!!busy.loadingMore}
              onLoadMore={loadMoreMails}
            />
          )}
        </div>

        <nav className="mobile-nav">
          <button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>
            <CalendarIcon size={20} /> Calendar
          </button>
          <button className={view === "agenda" ? "active" : ""} onClick={() => setView("agenda")}>
            <ListIcon size={20} /> Agenda
          </button>
          <button className={view === "inbox" ? "active" : ""} onClick={() => setView("inbox")}>
            <InboxIcon size={20} /> Inbox
          </button>
        </nav>
      </div>

      {extractDraft && (
        <ExtractModal
          draft={extractDraft.draft}
          email={extractDraft.email}
          onConfirm={confirmEvent}
          onClose={() => setExtractDraft(null)}
          saving={busy.saving}
          gcalAvailable={!!gmail}
        />
      )}

      {showPush && (
        <PushModal
          events={modeEvents}
          onClose={() => setShowPush(false)}
          onConfirm={runPush}
          busy={!!busy.pushing}
          progress={pushProgress}
        />
      )}

      {detailEvent && (
        <EventModal
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onDelete={deleteEvent}
          onOpenSource={openSourceEmail}
        />
      )}

      <div className="toasts">
        {apiDown && (
          <div className="toast" style={{ background: "var(--danger)", color: "#fff" }}>
            Backend not reachable — start it with start_backend.bat
          </div>
        )}
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <span className="t-icon">
              {t.icon === "spark" ? <SparklesIcon size={16} /> : <CheckIcon size={16} />}
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
