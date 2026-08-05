import { useMemo, useState } from "react";
import { todayISO } from "../utils";
import { CalendarIcon, XIcon, CheckIcon, ShieldIcon } from "../icons";

/**
 * Confirmation for "Push to Google Calendar".
 * States exactly what will happen before anything is written.
 */
export default function PushModal({ events, onClose, onConfirm, busy, progress }) {
  const [includeShared, setIncludeShared] = useState(true);
  const [includePersonal, setIncludePersonal] = useState(true);
  const [futureOnly, setFutureOnly] = useState(true);

  const selected = useMemo(() => {
    const today = todayISO();
    return events.filter((e) => {
      if (e.gcal) return false;                     // came FROM Google already
      if (e.layer === "shared" && !includeShared) return false;
      if (e.layer === "personal" && !includePersonal) return false;
      if (futureOnly && e.date < today) return false;
      return true;
    });
  }, [events, includeShared, includePersonal, futureOnly]);

  const nShared = selected.filter((e) => e.layer === "shared").length;
  const nPersonal = selected.filter((e) => e.layer === "personal").length;
  const pct = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="overlay" onClick={busy ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <CalendarIcon size={18} />
          <h2>Push to Google Calendar</h2>
          <div className="spacer" />
          {!busy && (
            <button className="icon-btn" onClick={onClose}>
              <XIcon size={16} />
            </button>
          )}
        </div>

        <div className="modal-body">
          <div className="push-summary">
            <div className="push-count">{selected.length}</div>
            <div>
              <b>events will be written</b>
              <div className="push-sub">
                {nShared} campus · {nPersonal} personal
              </div>
            </div>
          </div>

          <div className="push-target">
            <ShieldIcon size={15} />
            <span>
              Everything goes into a separate calendar called
              <b> “CampusCal — IIMA”</b>, created automatically. If your Google account
              hasn’t granted calendar-creation permission, they go to your main calendar
              instead — either way every event is tagged, so
              <b> “Remove events CampusCal pushed”</b> cleans up exactly what was added.
            </span>
          </div>

          <div className="push-opts">
            <label className="gcal-check">
              <input type="checkbox" checked={includeShared} disabled={busy}
                     onChange={(e) => setIncludeShared(e.target.checked)} />
              Campus calendar events
            </label>
            <label className="gcal-check">
              <input type="checkbox" checked={includePersonal} disabled={busy}
                     onChange={(e) => setIncludePersonal(e.target.checked)} />
              My calendar events
            </label>
            <label className="gcal-check">
              <input type="checkbox" checked={futureOnly} disabled={busy}
                     onChange={(e) => setFutureOnly(e.target.checked)} />
              Upcoming events only (skip past dates)
            </label>
          </div>

          <div className="privacy-note">
            <CheckIcon size={15} />
            <span>
              Safe to run twice — events already pushed are updated in place, never
              duplicated.
            </span>
          </div>

          {busy && (
            <div className="push-progress">
              <div className="conf-track">
                <div className="conf-fill" style={{ width: `${pct}%` }} />
              </div>
              <span>
                {progress.done} / {progress.total}
              </span>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={busy || selected.length === 0}
            onClick={() => onConfirm(selected)}
          >
            {busy ? "Pushing…" : `Push ${selected.length} events`}
          </button>
        </div>
      </div>
    </div>
  );
}
