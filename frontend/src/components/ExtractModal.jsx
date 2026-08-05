import { useState } from "react";
import { CATEGORIES, shortLabel } from "../utils";
import { SparklesIcon, ShieldIcon, XIcon, TagIcon, LinkIcon } from "../icons";

// Preview of what the extraction layer read from ONE email.
// Every field is editable before confirming — the human stays in control.
export default function ExtractModal({ draft, email, onConfirm, onClose, saving, gcalAvailable }) {
  const [form, setForm] = useState({
    title: draft.title || "",
    category: draft.category || "other",
    date: draft.date || "",
    start_time: draft.start_time || "",
    end_time: draft.end_time || "",
    venue: draft.venue || "",
  });
  const [pushToGoogle, setPushToGoogle] = useState(true);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const pct = Math.round((draft.confidence || 0) * 100);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <SparklesIcon size={18} />
          <h2>Add to your calendar</h2>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose}>
            <XIcon size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="confidence">
            <span>Parsed from this email</span>
            <div className="conf-track">
              <div className="conf-fill" style={{ width: `${pct}%` }} />
            </div>
            <b>{pct}%</b>
          </div>

          {draft.source_label && (
            <div className="detail-row wrap">
              <span className="tag outline">
                <TagIcon size={11} /> {shortLabel(draft.source_label)}
              </span>
              <span className="tag outline">
                {draft.label_source === "gmail_label"
                  ? "from your Gmail label"
                  : draft.label_source === "rule"
                  ? "matched a filter rule"
                  : "keyword fallback"}
              </span>
            </div>
          )}

          {draft.links?.length > 0 && (
            <div className="link-list titled">
              <span className="link-list-title">Links found in this mail</span>
              {draft.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
                  <LinkIcon size={13} /> {l.label} — {l.url.replace(/^https?:\/\//, "").slice(0, 40)}
                </a>
              ))}
            </div>
          )}

          <div className="field">
            <label>Title</label>
            <input value={form.title} onChange={set("title")} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={set("category")}>
                {Object.entries(CATEGORIES).map(([k, m]) => (
                  <option key={k} value={k}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={set("date")} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Starts</label>
              <input type="time" value={form.start_time} onChange={set("start_time")} />
            </div>
            <div className="field">
              <label>Ends</label>
              <input type="time" value={form.end_time} onChange={set("end_time")} />
            </div>
          </div>

          <div className="field">
            <label>Venue</label>
            <input value={form.venue} onChange={set("venue")} placeholder="e.g. CR-2" />
          </div>

          {gcalAvailable && (
            <label className="gcal-check">
              <input
                type="checkbox"
                checked={pushToGoogle}
                onChange={(e) => setPushToGoogle(e.target.checked)}
              />
              Also add to my Google Calendar
            </label>
          )}

          <div className="privacy-note">
            <ShieldIcon size={15} />
            <span>
              Only the email you clicked was read — never your whole inbox. This event goes to
              <b> your personal calendar</b> only.
            </span>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!form.title || !form.date || saving}
            onClick={() =>
              onConfirm({
                ...form,
                start_time: form.start_time || null,
                end_time: form.end_time || null,
                venue: form.venue || null,
                layer: "personal",
                confidence: draft.confidence,
                pushToGoogle: gcalAvailable && pushToGoogle,
              })
            }
          >
            {saving ? "Adding…" : "Add event"}
          </button>
        </div>
      </div>
    </div>
  );
}
