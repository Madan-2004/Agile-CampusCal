import { useMemo, useState } from "react";
import { avatarColor, fmtReceived, initials, shortLabel } from "../utils";
import { SparklesIcon, BackIcon, CheckIcon, TrashIcon } from "../icons";

// ---- mail body rendering: clickable links + collapsed quoted replies ----

const URL_RE = /(https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+)/g;

function linkify(text) {
  const parts = [];
  let last = 0;
  let key = 0;
  let m;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    let url = m[0];
    let trail = "";
    const t = url.match(/[.,;:!?)\]]+$/); // don't swallow trailing punctuation
    if (t) {
      trail = t[0];
      url = url.slice(0, -trail.length);
    }
    const href = url.startsWith("http") ? url : `https://${url}`;
    parts.push(
      <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
        {url}
      </a>
    );
    if (trail) parts.push(trail);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

const QUOTE_PATTERNS = [
  /^On .{0,200}wrote:\s*$/m,          // Gmail reply header
  /^-{2,}\s*Original Message\s*-{2,}/im,
  /^-{2,}\s*Forwarded message\s*-{2,}/im,
  /^_{5,}\s*$/m,                      // Outlook divider
  /^>\s?/m,                           // classic > quoting
];

function splitQuoted(body) {
  let idx = -1;
  for (const re of QUOTE_PATTERNS) {
    const m = re.exec(body);
    if (m && m.index > 0 && (idx === -1 || m.index < idx)) idx = m.index;
  }
  if (idx === -1) return [body, null];
  return [body.slice(0, idx).trimEnd(), body.slice(idx).trim()];
}

function MailBody({ body }) {
  const [showQuoted, setShowQuoted] = useState(false);
  const [main, quoted] = useMemo(() => splitQuoted(body), [body]);
  return (
    <div className="reader-body">
      {linkify(main)}
      {quoted && (
        <div className="quoted-wrap">
          <button className="quoted-toggle" onClick={() => setShowQuoted((q) => !q)}>
            {showQuoted ? "Hide quoted text" : "··· Show quoted text"}
          </button>
          {showQuoted && <div className="quoted">{linkify(quoted)}</div>}
        </div>
      )}
    </div>
  );
}

// ---- inbox ----

export default function Inbox({
  emails, selected, onSelect, onBack, onAddToCalendar, onRemoveFromCalendar,
  extracting, personalEventFor, sharedEventFor,
  hasMore, loadingMore, onLoadMore,
}) {
  const sel = emails.find((m) => m.id === selected) || null;
  const selPersonal = sel ? personalEventFor(sel) : null;
  const selShared = sel ? sharedEventFor(sel) : null;

  return (
    <div className={`inbox ${sel ? "reading" : ""}`}>
      <div className="mail-list">
        <div className="mail-list-head">Student mail · {emails.length}</div>
        {emails.map((m) => (
          <button
            key={m.id}
            className={`mail-row ${m.id === selected ? "selected" : ""} ${m.read ? "" : "unread"}`}
            onClick={() => onSelect(m.id)}
          >
            <span className="avatar" style={{ background: avatarColor(m.sender_name) }}>
              {initials(m.sender_name)}
            </span>
            <span className="mail-mid">
              <span className="mail-top-line">
                <span className="mail-sender">{m.sender_name}</span>
                {m.labels?.length > 0 && (
                  <span className="pill label">{shortLabel(m.labels[0])}</span>
                )}
                {!m.labels?.length && m.is_official && (
                  <span className="pill official">official</span>
                )}
                {(personalEventFor(m) || sharedEventFor(m) || m.event_ids.length > 0) && (
                  <span className="pill added">on calendar</span>
                )}
                <span className="mail-time">{fmtReceived(m.received_at)}</span>
              </span>
              <span className="mail-subject">{m.subject}</span>
              <span className="mail-snippet">{m.snippet}</span>
            </span>
            {!m.read && <span className="unread-dot" />}
          </button>
        ))}

        {hasMore && (
          <button className="load-more" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more mails"}
          </button>
        )}
      </div>

      <div className="reader">
        {sel ? (
          <div className="reader-inner">
            <button className="back-btn" onClick={onBack}>
              <BackIcon size={16} /> Inbox
            </button>
            <h2 className="reader-subject">{sel.subject}</h2>
            <div className="reader-meta">
              <span className="avatar" style={{ background: avatarColor(sel.sender_name) }}>
                {initials(sel.sender_name)}
              </span>
              <span>
                <div className="reader-from">{sel.sender_name}</div>
                <div className="reader-addr">{sel.sender_email}</div>
              </span>
              {sel.gmail && <span className="pill gmail">gmail</span>}
              {sel.is_official && <span className="pill official">official mailbox</span>}
            </div>

            <MailBody body={sel.body} />

            <div className="reader-actions">
              {selPersonal ? (
                <button
                  className="btn btn-danger"
                  onClick={() => onRemoveFromCalendar(sel)}
                  title="Removes this event from your personal calendar"
                >
                  <TrashIcon size={15} /> Remove from my calendar
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => onAddToCalendar(sel)}
                  disabled={extracting}
                >
                  <SparklesIcon size={15} />
                  {extracting ? "Reading email…" : "Add to calendar"}
                </button>
              )}
              {(selShared || (sel.shared_event_ids && sel.shared_event_ids.length > 0)) && (
                <button className="btn btn-ghost" disabled>
                  <CheckIcon size={15} /> On the campus calendar
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="reader-placeholder">Select an email to read it</div>
        )}
      </div>
    </div>
  );
}
