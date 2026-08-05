import { catMeta, fmtTimeRange, relDay, todayISO } from "../utils";
import { LinkIcon } from "../icons";

export default function AgendaPanel({ events, onEventClick, force = false }) {
  const today = todayISO();
  const upcoming = events.filter((e) => e.date >= today);

  const byDate = {};
  for (const ev of upcoming) (byDate[ev.date] ||= []).push(ev);
  const dates = Object.keys(byDate).sort();

  return (
    <aside className={`agenda ${force ? "force" : ""}`}>
      <h3>Upcoming</h3>
      {dates.map((d) => (
        <div className="agenda-day" key={d}>
          <div className="agenda-date">
            {relDay(d) === "Today" || relDay(d) === "Tomorrow" ? (
              <span className="rel">{relDay(d)}</span>
            ) : (
              relDay(d)
            )}
          </div>
          {byDate[d].map((ev) => {
            const meta = catMeta(ev.category);
            return (
              <button
                key={ev.id}
                className="agenda-card"
                style={{ "--chip-color": meta.color }}
                onClick={() => onEventClick(ev)}
              >
                <span className="agenda-bar" />
                <span className="agenda-body">
                  <div className="agenda-title">{ev.title}</div>
                  <div className="agenda-meta">
                    <span>{fmtTimeRange(ev)}</span>
                    {ev.venue && <span>· {ev.venue}</span>}
                    {(ev.links || []).some((l) => l.kind === "register") && (
                      <span className="meta-link"><LinkIcon size={11} /> register</span>
                    )}
                  </div>
                </span>
                <span className="tag" style={{ background: meta.color }}>
                  {meta.short}
                </span>
              </button>
            );
          })}
        </div>
      ))}
      {dates.length === 0 && <div className="empty">No upcoming events match your filters.</div>}
    </aside>
  );
}
