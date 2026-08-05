import { useState } from "react";
import { DAY_NAMES, catMeta, fmtTime, monthMatrix, todayISO, toISO, relDay, fmtTimeRange } from "../utils";
import { XIcon, LinkIcon } from "../icons";

function Chip({ ev, onClick, pop }) {
  const meta = catMeta(ev.category);
  const hasLink = (ev.links || []).some((l) => l.kind === "register" || l.kind === "meeting");
  return (
    <button
      className={`chip ${ev.layer === "personal" ? "personal" : ""} ${pop ? "pop" : ""}`}
      style={{
        "--chip-color": meta.color,
        "--chip-bg": `color-mix(in srgb, ${meta.color} 11%, var(--surface))`,
      }}
      onClick={() => onClick(ev)}
      title={ev.title}
    >
      {ev.start_time && <span className="chip-time">{fmtTime(ev.start_time)}</span>}
      <span>{ev.title}</span>
      {hasLink && <LinkIcon size={10} />}
    </button>
  );
}

export default function MonthGrid({ cursor, events, onEventClick, popIds }) {
  const [daySheet, setDaySheet] = useState(null); // ISO date for mobile bottom sheet
  const today = todayISO();
  const cells = monthMatrix(cursor.getFullYear(), cursor.getMonth());

  const byDate = {};
  for (const ev of events) (byDate[ev.date] ||= []).push(ev);

  const sheetEvents = daySheet ? byDate[daySheet] || [] : [];

  return (
    <div className="cal-wrap">
      <div className="dow-row">
        {DAY_NAMES.map((d) => (
          <div key={d} className="dow">{d}</div>
        ))}
      </div>

      <div className="month-grid">
        {cells.map(({ date, inMonth }) => {
          const iso = toISO(date);
          const evs = byDate[iso] || [];
          const visible = evs.slice(0, 3);
          const extra = evs.length - visible.length;
          return (
            <div
              key={iso}
              className={`day-cell ${inMonth ? "" : "out"} ${iso === today ? "today" : ""}`}
              onClick={() => evs.length && setDaySheet(iso)}
            >
              <span className="day-num">{date.getDate()}</span>

              {visible.map((ev) => (
                <Chip
                  key={ev.id}
                  ev={ev}
                  pop={popIds.has(ev.id)}
                  onClick={(e) => onEventClick(e)}
                />
              ))}
              {extra > 0 && (
                <button className="more-link" onClick={(e) => { e.stopPropagation(); setDaySheet(iso); }}>
                  +{extra} more
                </button>
              )}

              {/* mobile: dots instead of chips */}
              <span className="dots-row" style={{ display: "none" }}>
                {evs.slice(0, 4).map((ev) => (
                  <span
                    key={ev.id}
                    className="dot"
                    style={{ background: catMeta(ev.category).color }}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>

      {daySheet && (
        <>
          <div className="overlay" style={{ zIndex: 55 }} onClick={() => setDaySheet(null)} />
          <div className="day-sheet">
            <div className="sheet-handle" />
            <h3>
              {relDay(daySheet)}{" "}
              <button className="icon-btn" style={{ float: "right" }} onClick={() => setDaySheet(null)}>
                <XIcon size={15} />
              </button>
            </h3>
            {sheetEvents.map((ev) => {
              const meta = catMeta(ev.category);
              return (
                <button
                  key={ev.id}
                  className="agenda-card"
                  style={{ "--chip-color": meta.color }}
                  onClick={() => { setDaySheet(null); onEventClick(ev); }}
                >
                  <span className="agenda-bar" />
                  <span className="agenda-body">
                    <div className="agenda-title">{ev.title}</div>
                    <div className="agenda-meta">
                      <span>{fmtTimeRange(ev)}</span>
                      {ev.venue && <span>· {ev.venue}</span>}
                    </div>
                  </span>
                  <span className="tag" style={{ background: meta.color }}>{meta.short}</span>
                </button>
              );
            })}
            {sheetEvents.length === 0 && <div className="empty">Nothing scheduled.</div>}
          </div>
        </>
      )}
    </div>
  );
}
