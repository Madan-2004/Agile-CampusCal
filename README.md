# CampusCal

**Turning the campus inbox into a calendar that fills itself.**

Submission for the Agile CCC Ideathon, IIM Ahmedabad.

Campus information is not missing, it is scattered. Quizzes, deadlines, club events and
placement notices all arrive by email, get buried within hours, and most students find out
second hand. Every calendar tool assumes somebody types the event in, and that is exactly
the step nobody performs.

CampusCal reads the inbox and writes the calendar. No manual entry at any point.

---

## Contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Setup and run](#setup-and-run)
- [Demo mode vs Gmail mode](#demo-mode-vs-gmail-mode)
- [Connecting your own Gmail](#connecting-your-own-gmail)
- [Project structure](#project-structure)
- [Changing the classification rules](#changing-the-classification-rules)
- [Tests](#tests)
- [Resetting the local data](#resetting-the-local-data)
- [Troubleshooting](#troubleshooting)
- [Privacy and security](#privacy-and-security)

---

## What it does

**Two calendar layers, filled automatically from mail.**

- **Campus calendar (shared).** Broadcasts anyone on campus may attend: seminars, club
  events, notices, workshops.
- **My calendar (personal).** Mail addressed to the individual student: exams,
  assignments, classes, placement notices.

**Six capabilities, all working in the prototype.**

| Capability | What it does | Scale in the running build |
|---|---|---|
| Gmail ingestion | Reads the inbox over the Gmail API, read only, paged, with a live poll | 100 mails per page, 45 second poll |
| Segmentation | Routes every mail onto one source label and one calendar category | 18 labels, 9 categories, 4 tiers |
| Event extraction | Pulls title, date, time, venue and links from the mail body | 237 weighted keywords, 5 date formats |
| Registration links | Detects the registration or meeting URL and promotes it to a button | 4 link classes, tracking links dropped |
| Google Calendar sync | Reads existing calendars, pushes CampusCal events back, reversibly | idempotent, one click undo |
| Responsive interface | One codebase across desktop, tablet and mobile, with dark mode | 3 breakpoints, light and dark themes |

---

## How it works

```
                         ┌─────────────────────────────────────────────┐
                         │                 BROWSER (React)             │
  Google Identity  ───►  │  OAuth token, kept in memory only           │
  Services (GIS)         │     ├── Gmail API ──► inbox messages        │
                         │     ├── Calendar API ──► class schedules    │
                         │     └── Calendar API ◄── push new events    │
                         │  fetch /api/* ──────────────┐               │
                         └─────────────────────────────┼───────────────┘
                                                       ▼
                         ┌─────────────────────────────────────────────┐
                         │            FASTAPI BACKEND (:8000)          │
                         │  parser.py    extraction engine             │
                         │  rules_engine.py   Gmail-style rule matcher │
                         │  /api/gmail/sync   auto-pipeline + routing  │
                         │            SQLite (campuscal.db)            │
                         └─────────────────────────────────────────────┘
```

The OAuth token never reaches the backend. The browser talks to Google directly; the
backend only ever receives mail *text* to parse.

### The pipeline

1. **Ingest.** Gmail API, read only. Runs on sign-in, on each "Load more mails", and on a
   45 second poll while the app is open.
2. **Classify.** Four tiers, most certain first (below).
3. **Extract.** Date, time, venue and links, after quoted reply text is stripped.
4. **Publish.** Campus layer or personal layer, with an optional push to Google Calendar.

### Classification, four tiers

| Tier | Signal used | How it decides |
|---|---|---|
| 1 | The label Gmail already applied | Reads the `IIMA/*` label the student's own Gmail filters attached |
| 2 | Imported filter rules | Re-evaluates the same 21 rules inside the app, for accounts that never imported the filters |
| 3 | Generic sender rules | Covers the non-IIMA world: LinkedIn, Unstop, Coursera, Meetup, banks, delivery, newsletters |
| 4 | Weighted keyword scoring | Subject hits count three times body hits; the highest scoring category wins, otherwise `Other` |

Two axes are kept separate on purpose. **Source labels** (18) answer *who sent it* and
carry provenance on every event. **Categories** (9) answer *what kind of thing it is* and
drive the colour on the calendar; nine colours read cleanly on a month grid, eighteen do
not. Four labels are denylisted and never create events at all.

### The surety gate

Classification alone does not create an event. Before anything is written:

1. **A parseable, future date.** Quoted reply text is stripped first, so a date inside an
   older message in the thread cannot create a phantom event.
2. **A corroborating signal.** A time, a venue, or event language. A vague date such as
   "tomorrow" is accepted only when the mail also pins a time or a place.
3. **Not already on the calendar.** Deduplicated on the Gmail message id, and on the same
   title with the same date, so reminder mails do not duplicate.

Rejected mail is not lost. It keeps a one click **Add to calendar** button that opens the
same parsed draft, with a confidence score, for the student to correct and confirm.

---

## Prerequisites

| Requirement | Check with | Notes |
|---|---|---|
| Python 3.10 or newer | `python --version` | On Windows, use `py --version` if `python` is not recognised |
| Node.js 18 or newer | `node --version` | Ships with npm |
| A browser | | Chrome, Edge or Firefox |

Internet is needed for the first install (packages) and for Gmail mode. Demo mode runs
fully offline afterwards.

---

## Setup and run

The app is two processes: a FastAPI backend and a Vite dev server. Run them in **two
separate terminals** and leave both open.

### 1. Clone

```bash
git clone https://github.com/Madan-2004/Agile-CampusCal.git
cd Agile-CampusCal
```

### 2. Backend, terminal 1

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Wait for `Application startup complete`. Verify it by opening
<http://localhost:8000/api/stats>, which should return a small JSON object.

> Visiting <http://localhost:8000/> directly returns 404. That is expected: the API lives
> under `/api/...`, there is no page at the root.

*Optional but recommended:* use a virtual environment so the packages stay isolated.

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS or Linux
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### 3. Frontend, terminal 2

```bash
cd frontend
npm install
npm run dev
```

`npm install` takes a minute on the first run only. Then open the URL it prints, normally
<http://localhost:5173>.

The Vite dev server proxies `/api/*` to the backend on port 8000, so there is no CORS
setup to do.

### 4. Daily use after the first install

```bash
# terminal 1
cd backend && python -m uvicorn main:app --reload --port 8000

# terminal 2
cd frontend && npm run dev
```

### Production build of the frontend, optional

```bash
cd frontend
npm run build      # outputs to frontend/dist
npm run preview    # serves the built bundle
```

---

## Demo mode vs Gmail mode

**Demo mode** is the default and needs no Google account. The app boots with a seeded
campus inbox of realistic IIMA mails, sent from the real office and club addresses, so the
classifier exercises the same rules a live account would. The **Simulate new mail** button
delivers a fresh mail and shows it being parsed onto the calendar in real time.

**Gmail mode** starts when you sign in from the avatar in the top right. The demo inbox and
demo events are then hidden entirely, and everything you see comes from your own account.
Sign out to return to demo mode.

---

## Connecting your own Gmail

This is optional. It takes about five minutes and needs a Google account. A personal Gmail
account works; you do not need an institute account, and an institute account may be
blocked by its Workspace administrator.

1. Go to <https://console.cloud.google.com/> and create a **New Project**.
2. **APIs & Services, Library**: enable **Gmail API**.
3. **APIs & Services, Library**: enable **Google Calendar API**. Both are required.
4. **APIs & Services, OAuth consent screen**: choose **External**, fill in the app name and
   your email, and save. Under **Audience, Test users**, add every Google address you plan
   to sign in with. Unverified apps only allow listed test users.
5. **APIs & Services, Credentials, Create credentials, OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: `http://localhost:5173`
   - Leave "Authorized redirect URIs" empty
   - Create, then copy the **Client ID**, which ends in `.apps.googleusercontent.com`
6. In the `frontend` folder, copy `.env.example` to `.env` and paste the value:

   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   ```

7. Restart `npm run dev`, then sign in from the avatar. Google will warn that the app is
   unverified, which is normal in testing mode. Continue, and **tick every permission box**,
   including the calendar ones.

`.env` is git-ignored, so your Client ID is never committed.

### Scopes requested and why

| Scope | Why it is needed |
|---|---|
| `gmail.readonly` | Read inbox messages to parse events. Nothing is ever sent, deleted or modified |
| `calendar` | Create the dedicated "CampusCal, IIMA" calendar |
| `calendar.events` | Write parsed events into that calendar |
| `userinfo.profile`, `userinfo.email` | Show your name, email and photo in the account menu |

### Pushing events to Google Calendar

The **Push to Google Calendar** button writes every event into a **separate** calendar
named "CampusCal, IIMA", created automatically. Your existing calendars are untouched.
Running it twice is safe: events already pushed are updated in place, never duplicated,
because each carries an internal tag. The account menu has **Remove events CampusCal
pushed**, which deletes exactly what the app created and nothing else.

If calendar creation is refused, the app falls back to your primary calendar rather than
failing, and the events remain equally removable.

---

## Project structure

```
Agile-CampusCal/
├─ README.md
├─ .gitignore
├─ backend/                        FastAPI + SQLite
│  ├─ main.py                      API routes, sync pipeline, migrations
│  ├─ parser.py                    extraction engine and classifier
│  ├─ rules_engine.py              Gmail-style query matcher
│  ├─ categories.py                labels, categories, layer routing, denylist
│  ├─ links.py                     registration and meeting link extraction
│  ├─ models.py                    Email and Event tables
│  ├─ database.py                  SQLite setup
│  ├─ seed.py                      seeded demo inbox
│  ├─ test_classification.py       126 automated checks
│  ├─ requirements.txt
│  ├─ rules/gmail_filters_import.xml   source of truth for the rules
│  └─ tools/build_rules.py         regenerates gmail_rules.json from the XML
├─ frontend/                       React 18 + Vite
│  ├─ .env.example                 template for the Client ID
│  ├─ package.json
│  ├─ vite.config.js               dev proxy to the backend
│  └─ src/
│     ├─ App.jsx                   state and composition
│     ├─ api.js                    backend client
│     ├─ gmail.js                  Gmail and Google Calendar integration
│     ├─ config.js                 reads the Client ID from .env
│     ├─ utils.js, icons.jsx
│     ├─ styles.css                design system, light and dark, responsive
│     └─ components/               Sidebar, TopBar, MonthGrid, AgendaPanel,
│                                  Inbox, ExtractModal, EventModal, PushModal, Profile
└─ deck/                           Ideathon presentation and its generator
```

### API endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/emails` | Seeded demo inbox |
| POST | `/api/emails/{id}/extract` | Parse one demo mail into an editable draft |
| POST | `/api/parse` | Parse raw subject and body, used for real Gmail mails |
| POST | `/api/gmail/sync` | Bulk pipeline for the signed-in account, with dedupe |
| POST | `/api/classify` | Categorise many titles at once, used for Google Calendar events |
| GET | `/api/taxonomy` | Category and label vocabulary |
| GET, POST, DELETE | `/api/events` | Calendar CRUD |
| PATCH | `/api/events/{id}/gcal` | Record the Google Calendar id after a push |
| POST | `/api/simulate/new-email` | Demo only: deliver a new mail and parse it live |
| GET | `/api/stats` | Health and counters |

---

## Changing the classification rules

The rules come from `backend/rules/gmail_filters_import.xml`, the same file that is
imported into Gmail. To add a sender or change a subject pattern:

1. Edit the XML, or re-export the filters from Gmail and replace the file.
2. Regenerate the rule set:

   ```bash
   cd backend
   python tools/build_rules.py
   ```

3. Restart the backend. The website now classifies exactly like the inbox does.

Label to category to layer mapping, the personal-intent overrides and the denylist live in
`backend/categories.py`. Keyword weights live in `CATEGORY_KEYWORDS` in
`backend/parser.py`.

---

## Tests

```bash
cd backend
python test_classification.py
```

Expected output: `126 passed, 0 failed`. The suite covers rule coverage, sender and subject
routing, category assignment, layer routing, the denylist, tier precedence, the surety
gate, quoted reply handling, link extraction and time formats. No pytest required.

---

## Resetting the local data

```bash
# stop the backend first
cd backend
del campuscal.db      # Windows
rm campuscal.db       # macOS or Linux
python -m uvicorn main:app --reload --port 8000
```

The seeded inbox is recreated with dates relative to today, so the demo always looks
current. Events you added manually are lost; events already pushed to Google Calendar are
not affected.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Red toast, "Backend not reachable" | The backend terminal is not running. Start it first |
| 404 at `http://localhost:8000/` | Expected. The API lives under `/api/...` |
| `python` is not recognised (Windows) | Use `py` instead, or reinstall Python with "Add to PATH" ticked |
| Port 8000 already in use | Use `--port 8001` and change the proxy target in `frontend/vite.config.js` |
| Sign-in button says to add a Client ID | Create `frontend/.env` from `.env.example` and restart `npm run dev` |
| "Enable the Google Calendar API" | The Calendar API is not enabled in your Cloud project. Enable it in the Library |
| "Calendar access not granted" | You skipped a permission box. Log out, sign in again, tick all of them |
| "Could not create calendar (403)" | The session predates the calendar scope. Log out and sign in again. Pushes still work, into your main calendar |
| Google warns the app is unverified | Normal for a testing-mode OAuth app. Continue, provided you are the developer |
| Everything lands in "Other" | You are signed in to an account with no IIMA mail. Expected: tiers 3 and 4 still classify common senders |

---

## Privacy and security

**Design decisions.**

- Gmail is requested **read only**. The app never sends, deletes or modifies mail.
- The OAuth access token is held in browser memory only. It is never written to
  `localStorage` and never sent to the backend.
- Real Gmail messages are **never stored**. Mail text is parsed in transit; only the
  resulting event (title, date, time, venue, links, source label) is saved locally.
- The personal "Add to calendar" flow reads **only the one email** the student opened.
- Access can be revoked at any time from the Google account permissions page.

**Before you push to GitHub.**

- `frontend/.env` holds your Client ID and is git-ignored. Never commit it.
- `backend/campuscal.db` is git-ignored. It can contain event titles parsed from a real
  inbox, so it must not be committed.
- `node_modules/` and `__pycache__/` are git-ignored and should not be tracked.
- `deck/img/` contains screenshots of a real inbox, including other people's names and
  subject lines. Consider whether that belongs in a public repository.

A note on the OAuth Client ID: for a browser-based web client it is not a password, and
Google expects it to be visible in the page. Restricting **Authorized JavaScript origins**
to `http://localhost:5173` is what actually protects it. Keeping it in `.env` is good
practice rather than a strict necessity.

---

## Status

The prototype is complete end to end and runs against a live Gmail account today. It works
one account at a time and polls Gmail rather than subscribing to push notifications, and
the extraction layer is deterministic rather than model based. Both are deliberate choices
for a prototype, and both are single component swaps: the parser returns the same JSON
shape an LLM call would, and the marked slot in `backend/parser.py` shows where that call
goes.
