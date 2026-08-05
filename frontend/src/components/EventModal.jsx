import { catMeta, fmtDateLong, fmtTimeRange, shortLabel } from "../utils";
import {
  ClockIcon, PinIcon, MailIcon, TrashIcon, XIcon, CalendarIcon, TagIcon, LinkIcon,
} from "../icons";

export default function EventModal({ event, onClose, onDelete, onOpenSource }) {
  const meta = catMeta(event.category);
  const links = event.links || [];
  const primary = links.find((l) => l.kind === "register") || links.find((l) => l.kind === "meeting");
  const rest = links.filter((l) => l !== primary);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="cat-dot" style={{ background: meta.color, width: 12, height: 12 }} />
          <h2>{event.title}</h2>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose}>
            <XIcon size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-row">
            <CalendarIcon size={16} />
            <b>{fmtDateLong(event.date)}</b>
          </div>
          <div className="detail-row">
            <ClockIcon size={16} />
            {fmtTimeRange(event)}
          </div>
          {event.venue && (
            <div className="detail-row">
              <PinIcon size={16} />
              {event.venue}
            </div>
          )}

          <div className="detail-row wrap">
            <span className="tag" style={{ background: meta.color }}>{meta.short}</span>
            <span className="tag outline">
              {event.layer === "shared" ? "Campus calendar" : "My calendar"}
            </span>
            {event.source_label && (
              <span className="tag outline">
                <TagIcon size={11} /> {shortLabel(event.source_label)}
              </span>
            )}
          </div>

          {primary && (
            <a className="btn btn-primary register-btn" href={primary.url}
               target="_blank" rel="noopener noreferrer">
              <LinkIcon size={15} /> {primary.label}
            </a>
          )}

          {rest.length > 0 && (
            <div className="link-list">
              {rest.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
                  <LinkIcon size={13} /> {l.url.replace(/^https?:\/\//, "").slice(0, 46)}
                </a>
              ))}
            </div>
          )}

          {event.gcal && (
            <div className="detail-row">
              <CalendarIcon size={16} />
              <span>From your <b>Google Calendar</b> · {event.calendar}</span>
            </div>
          )}
          {event.gcal_event_id && (
            <div className="detail-row">
              <CalendarIcon size={16} />
              <span>Synced to your <b>Google Calendar</b></span>
            </div>
          )}
          {event.external_ref && !event.source_email_id && (
            <div className="detail-row">
              <MailIcon size={16} />
              <span>Parsed from an email in <b>your Gmail inbox</b></span>
            </div>
          )}
          {event.source_email_id && (
            <div className="detail-row">
              <MailIcon size={16} />
              <span>
                Auto-parsed from mail by <b>{event.source_sender}</b> ·{" "}
                <button className="inline-link" onClick={() => onOpenSource(event.source_email_id)}>
                  view source email
                </button>
              </span>
            </div>
          )}
        </div>

        <div className="modal-foot">
          {event.layer === "personal" && !event.gcal && (
            <button className="btn btn-danger" onClick={() => onDelete(event)}>
              <TrashIcon size={15} /> Remove
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
