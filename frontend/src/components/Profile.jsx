import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID } from "../config";
import { MailIcon, XIcon } from "../icons";

export default function Profile({ gmail, signingIn, onSignIn, onSignOut, onUndoPush }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const connected = !!gmail;

  return (
    <div className="profile" ref={ref}>
      <button className="profile-btn" onClick={() => setOpen((o) => !o)} aria-label="Account">
        {connected && gmail.profile.picture ? (
          <img src={gmail.profile.picture} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="profile-fallback">{connected ? gmail.profile.name?.[0] : "M"}</span>
        )}
        <span className={`profile-status ${connected ? "on" : ""}`} />
      </button>

      {open && (
        <div className="profile-menu">
          <div className="profile-head">
            {connected && gmail.profile.picture ? (
              <img src={gmail.profile.picture} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="profile-fallback big">{connected ? gmail.profile.name?.[0] : "M"}</span>
            )}
            <div>
              <div className="profile-name">{connected ? gmail.profile.name : "Madan (demo student)"}</div>
              <div className="profile-email">
                {connected ? gmail.profile.email : "Not signed in · demo mode"}
              </div>
            </div>
          </div>

          {connected ? (
            <>
              <div className="profile-row">
                <MailIcon size={15} />
                Gmail connected · {gmail.mails.length} recent mails in inbox
              </div>
              <button
                className="btn btn-ghost profile-action"
                onClick={() => { setOpen(false); onUndoPush?.(); }}
              >
                Remove events CampusCal pushed
              </button>
              <button
                className="btn btn-ghost profile-action"
                onClick={() => { setOpen(false); onSignOut(); }}
              >
                <XIcon size={15} /> Log out
              </button>
            </>
          ) : (
            <>
              <div className="profile-row">
                Sign in to see your real Gmail inbox here and add real mails to your calendar.
              </div>
              <button
                className="btn btn-primary profile-action"
                disabled={signingIn}
                onClick={() => { setOpen(false); onSignIn(); }}
              >
                <GoogleG /> {signingIn ? "Opening Google…" : "Sign in with Google"}
              </button>
              {!GOOGLE_CLIENT_ID && (
                <div className="profile-note">
                  Needs a one-time setup: see <b>“Connecting real Gmail”</b> in the README, then
                  paste your Client ID into <code>src/config.js</code>.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const GoogleG = () => (
  <svg width="15" height="15" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
  </svg>
);
