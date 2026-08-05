import { MONTH_NAMES } from "../utils";
import {
  ChevronLeft, ChevronRight, MailPlusIcon, SunIcon, MoonIcon, UploadCloudIcon,
} from "../icons";
import Profile from "./Profile";

export default function TopBar({
  view, cursor, setCursor, layer, setLayer,
  onSimulate, simulating, theme, setTheme,
  gmail, signingIn, onSignIn, onSignOut, onPush, onUndoPush,
}) {
  const shiftMonth = (n) => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + n);
    setCursor(d);
  };

  const title =
    view === "inbox"
      ? "Inbox"
      : `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;

  return (
    <header className="topbar">
      <h1>{title}</h1>

      {view !== "inbox" && (
        <>
          <div className="month-nav">
            <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>
          <button className="btn btn-ghost" onClick={() => setCursor(new Date())}>
            Today
          </button>

          <div className="segmented" role="tablist" aria-label="Calendar layer">
            {[
              ["both", "Both"],
              ["shared", "Campus"],
              ["personal", "Mine"],
            ].map(([val, label]) => (
              <button
                key={val}
                className={layer === val ? "active" : ""}
                onClick={() => setLayer(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="spacer" />

      {gmail ? (
        <button
          className="btn btn-primary"
          onClick={onPush}
          title="Write every event on this calendar into your Google Calendar"
        >
          <UploadCloudIcon size={15} />
          <span className="hide-mobile">Push to Google Calendar</span>
        </button>
      ) : (
        <button
          className="btn btn-primary"
          onClick={onSimulate}
          disabled={simulating}
          title="Demo: a new official email arrives and the pipeline parses it live"
        >
          <MailPlusIcon size={15} />
          <span className="hide-mobile">{simulating ? "Delivering…" : "Simulate new mail"}</span>
        </button>
      )}

      <button
        className="icon-btn"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        aria-label="Toggle theme"
      >
        {theme === "light" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
      </button>

      <Profile
        gmail={gmail}
        signingIn={signingIn}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        onUndoPush={onUndoPush}
      />
    </header>
  );
}
