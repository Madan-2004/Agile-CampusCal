// ── Google sign-in configuration ──────────────────────────────────
// The OAuth Client ID is read from an environment variable so it never gets
// committed. Create `frontend/.env` (which is git-ignored) containing:
//
//     VITE_GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
//
// See "Connecting your own Gmail" in the README for how to create one.
// Leave it unset to run in demo mode: the seeded campus inbox, the parser,
// the calendar and every filter still work without any Google account.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// How many recent Gmail messages to pull per page (first load, and each
// "Load more mails" click). Gmail allows up to 500.
export const GMAIL_MAX_MESSAGES = 100;

// How many message-detail requests to run at once. Keeps Gmail happy while
// still loading 100 mails in a few seconds.
export const GMAIL_CONCURRENCY = 12;
