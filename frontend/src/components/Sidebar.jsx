import { useState } from "react";
import {
  CATEGORIES, DAY_NAMES, MONTH_NAMES, monthMatrix, todayISO, toISO, shortLabel,
} from "../utils";
import {
  CalendarIcon, InboxIcon, ChevronLeft, ChevronRight, ListIcon, TagIcon,
} from "../icons";

export default function Sidebar({
  view, setView, cursor, setCursor,
  filters, toggleFilter, toggleAll,
  sourceFilters, toggleSource, clearSources, sourceCounts,
  eventDates, counts, unreadCount,
}) {
  const [showSources, setShowSources] = useState(true);
  const today = todayISO();
  const cells = monthMatrix(cursor.getFullYear(), cursor.getMonth());
  const allOn = filters.size === Object.keys(CATEGORIES).length;

  const shiftMonth = (n) => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + n);
    setCursor(d);
  };

  const sources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">C</div>
        <div>
          <div className="brand-name">CampusCal</div>
          <div className="brand-sub">One calendar for IIMA</div>
        </div>
      </div>

      <nav className="nav">
        <button
          className={`nav-item ${view === "calendar" ? "active" : ""}`}
          onClick={() => setView("calendar")}
        >
          <CalendarIcon size={17} /> Campus Calendar
        </button>
        <button
          className={`nav-item ${view === "agenda" ? "active" : ""}`}
          onClick={() => setView("agenda")}
        >
          <ListIcon size={17} /> Agenda
        </button>
        <button
          className={`nav-item ${view === "inbox" ? "active" : ""}`}
          onClick={() => setView("inbox")}
        >
          <InboxIcon size={17} /> Inbox
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </button>
      </nav>

      <div className="mini-cal">
        <div className="mini-head">
          <span>
            {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <span className="mini-nav">
            <button onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight size={14} />
            </button>
          </span>
        </div>
        <div className="mini-grid">
          {DAY_NAMES.map((d) => (
            <div key={d} className="mini-dow">{d[0]}</div>
          ))}
          {cells.map(({ date, inMonth }) => {
            const iso = toISO(date);
            return (
              <button
                key={iso}
                className={`mini-day ${inMonth ? "" : "out"} ${iso === today ? "today" : ""}`}
                onClick={() => setCursor(new Date(date))}
              >
                {date.getDate()}
                {eventDates.has(iso) && <span className="dot" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="side-section-title">
          Categories
          <button className="link-btn" onClick={toggleAll}>
            {allOn ? "Clear" : "Select all"}
          </button>
        </div>
        <div className="filters">
          {Object.entries(CATEGORIES).map(([key, meta]) => (
            <button
              key={key}
              className={`filter-row ${filters.has(key) ? "" : "off"}`}
              onClick={() => toggleFilter(key)}
            >
              <span className="cat-dot" style={{ background: meta.color }} />
              {meta.label}
              <span className="filter-count">{counts[key] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {sources.length > 0 && (
        <div>
          <div className="side-section-title">
            <button className="section-toggle" onClick={() => setShowSources((s) => !s)}>
              Sources {showSources ? "−" : "+"}
            </button>
            {sourceFilters.size > 0 && (
              <button className="link-btn" onClick={clearSources}>Clear</button>
            )}
          </div>
          {showSources && (
            <div className="filters">
              {sources.map(([label, count]) => {
                const on = sourceFilters.size === 0 || sourceFilters.has(label);
                return (
                  <button
                    key={label}
                    className={`filter-row source ${on ? "" : "off"}`}
                    onClick={() => toggleSource(label)}
                    title={label}
                  >
                    <TagIcon size={13} />
                    <span className="src-name">{shortLabel(label)}</span>
                    <span className="filter-count">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="side-footer">
        Prototype for <b>Agile CCC · Ideathon</b>
        <br />
        Auto-labelled from campus mail · zero manual entry
      </div>
    </aside>
  );
}
