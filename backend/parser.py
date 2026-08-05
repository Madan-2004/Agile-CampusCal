"""
Event extraction engine.

This is the "LLM layer" of the architecture. For the prototype it is a
deterministic NLP parser (regex + keyword rules) so the demo runs offline
with zero setup. In production this function body is replaced by ONE call
to an LLM (Claude / GPT-4o-mini) with a JSON-schema prompt — the rest of
the system does not change, because both return the same EventDraft shape.

# ─────────────────────────  LLM SLOT  ─────────────────────────
# def extract_event(subject, body, received_at):
#     response = anthropic.messages.create(
#         model="claude-haiku-4-5",
#         messages=[{"role": "user", "content": EXTRACTION_PROMPT.format(
#             subject=subject, body=body, today=received_at.date())}],
#     )
#     return json.loads(response.content[0].text)   # same EventDraft dict
# ──────────────────────────────────────────────────────────────
"""
import re
from datetime import date, datetime, timedelta

from categories import (
    ACTIVITY_CATEGORIES, DEFAULT_LABEL, GENERIC_SENDER_RULES, LABEL_MAP,
    OVERRIDE_CATEGORIES, OVERRIDE_MIN_SCORE, PERSONAL_HINTS, WEAK_CATEGORIES,
    label_info,
)

LABEL_MAP_KEYS = tuple(LABEL_MAP.keys())
from links import extract_links
from rules_engine import RULES

MONTHS = {m: i + 1 for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun",
     "jul", "aug", "sep", "oct", "nov", "dec"])}

WEEKDAYS = {d: i for i, d in enumerate(
    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])}

# Known campus venues help the parser latch onto locations.
CAMPUS_VENUES = [
    "RJM Auditorium", "KLMDC", "IMDC", "LKP", "Louis Kahn Plaza", "CT Hall",
    "Bodhi", "Wing 11", "Classroom 1", "Classroom 2", "Classroom 3",
    "CR-1", "CR-2", "CR-3", "CR-4", "Sports Complex", "Faculty Block",
    "New Campus", "Old Campus", "Harvard Steps", "JSW School",
]

# Weighted keywords per category. A subject hit counts 3x a body hit.
# Highest total score wins (ties → earlier entry in this dict).
CATEGORY_KEYWORDS = {
    "exam": {
        "quiz": 3, "mid-term": 3, "midterm": 3, "end-term": 3, "endterm": 3,
        "exam": 3, "examination": 3, "viva": 3, "invigilation": 3,
        "seating arrangement": 3, "hall ticket": 3, "re-exam": 3, "makeup exam": 3,
        "question paper": 3, "answer script": 3, "grading": 2, "test": 2,
        "assessment": 2, "evaluation": 2, "marks": 2, "result": 2, "syllabus": 1,
    },
    "assignment": {
        "assignment": 3, "submission deadline": 3, "due on": 3, "due by": 3,
        "due date": 3, "last date": 3, "deadline": 3, "submit by": 3, "turnitin": 3,
        "you have submitted": 3, "problem set": 3, "case write-up": 3,
        "term paper": 3, "project report": 3, "group project": 2, "coursework": 2,
        "submission": 2, "submit": 2, "due": 2, "closes": 2, "closing": 2,
        "last day": 2, "apply by": 2, "register by": 2, "rsvp by": 2,
        "nominations close": 3, "entries close": 3,
    },
    "class": {
        "lecture": 3, "make-up class": 3, "makeup class": 3, "rem session": 3,
        "doubt session": 3, "doubt-clearing": 3, "tutorial": 3, "class": 2,
        "classes": 2, "session by prof": 3, "course outline": 3, "timetable": 3,
        "time table": 3, "course material": 2, "pre-read": 2, "readings": 2,
        "attendance": 2, "professor": 2, "faculty": 1, "course": 1, "module": 1,
        "certificate": 2, "enrolled": 2, "curriculum": 2,
    },
    "placement": {
        "placecom": 3, "pre-placement": 3, "ppt": 3, "shortlist": 3, "shortlisted": 3,
        "interview": 3, "recruitment": 3, "recruiter": 3, "cv submission": 3,
        "job alert": 3, "application status": 3, "hiring": 3, "internship": 3,
        "summer placement": 3, "final placement": 3, "company presentation": 3,
        "placement": 3, "job": 2, "role": 1, "resume": 2, "cv": 2, "offer letter": 3,
        "assessment centre": 3, "aptitude test": 3, "group discussion": 2,
        "career fair": 3, "walk-in": 3, "vacancy": 3, "opening": 2,
        "cv verification": 3, "cv points": 2, "cv submission": 3, "profile": 1,
        "summers": 2, "ppo": 3, "live project": 3, "consulting": 1, "banking": 1,
    },
    "workshop": {
        "workshop": 3, "masterclass": 3, "bootcamp": 3, "case prep": 3,
        "prep session": 3, "mock interview": 3, "crash course": 3, "hands-on": 3,
        "training": 3, "certification": 2, "guesstimate": 2, "skill": 1,
        "learn": 1, "tutorial session": 3, "clinic": 2, "practice session": 3,
    },
    "talk": {
        "seminar": 3, "speaker series": 3, "fireside": 3, "guest lecture": 3,
        "panel discussion": 3, "panel": 2, "keynote": 3, "talk by": 3,
        "in conversation": 3, "webinar": 3, "conclave": 3, "summit": 3,
        "symposium": 3, "colloquium": 3, "ted": 2, "ama": 2, "session with": 3,
        "interaction with": 3, "guest speaker": 3, "lecture series": 3,
    },
    "club_event": {
        "fest": 3, "competition": 3, "case competition": 3, "contest": 3,
        "challenge": 3, "case challenge": 3, "b-plan": 3, "bplan": 3,
        "audition": 3, "auditions": 3, "tournament": 3, "hackathon": 3,
        "open mic": 3, "match": 2, "league": 2, "concert": 3, "screening": 3,
        "cultural": 3, "trek": 3, "quizzing": 3, "celebration": 3, "party": 2,
        "inaugural": 2, "meetup": 3, "reunion": 3, "farewell": 3, "carnival": 3,
        "exhibition": 3, "showcase": 2, "tryouts": 3, "championship": 3,
        "essay writing": 3, "essay": 2, "cash prizes": 3, "prize": 2,
        "participate": 2, "participation": 2, "round 1": 2, "finals": 2,
        "gathering": 2, "social": 1, "get-together": 3, "outing": 2, "dinner": 2,
    },
    "admin": {
        "open house": 3, "town hall": 3, "orientation": 3, "induction": 3,
        "info session": 3, "maintenance": 3, "power shutdown": 3, "shutdown": 2,
        "water supply": 3, "notice": 2, "circular": 3, "advisory": 3,
        "hostel": 2, "mess": 2, "room allotment": 3, "registration": 2,
        "fee payment": 3, "fees": 2, "invoice": 2, "bill": 2, "payment due": 3,
        "wellness": 3, "health check": 3, "vaccination": 3, "medical": 2,
        "id card": 3, "gate pass": 3, "policy": 2, "guidelines": 2,
        "appointment": 2, "meeting": 2, "sync": 2, "stand-up": 2, "review meeting": 3,
        "election": 3, "elections": 3, "nomination": 3, "voting": 3, "ballot": 3,
        "dorm": 2, "representative": 2, "coordinator": 2, "committee": 1,
        "feedback form": 3, "survey": 2, "census": 2, "verification": 2,
    },
}

# Words that merely indicate "something is happening" — used to decide whether
# a mail has any event language at all (the auto-add signal).
EVENT_SIGNAL_WORDS = (
    "session", "meet", "event", "drive", "venue", "attend", "join us",
    "invited", "rsvp", "register", "schedule", "scheduled", "will be held",
)

# Quoted-reply / forward / signature markers. Everything below the first
# marker is an OLD mail — its dates and venues must not create events.
QUOTE_MARKERS = [
    re.compile(r"^On .{0,200}wrote:\s*$", re.M),
    re.compile(r"^-{2,}\s*Original Message\s*-{2,}", re.M | re.I),
    re.compile(r"^-{2,}\s*Forwarded message\s*-{2,}", re.M | re.I),
    re.compile(r"^_{5,}\s*$", re.M),
    re.compile(r"^>\s?", re.M),
    re.compile(r"^Sent from my ", re.M),
]


def strip_quoted(body: str) -> str:
    """Cut the body at the first quoted-reply marker so dates inside old
    threads (e.g. 'On Fri, 18 Jul 2026, X wrote:') can't create events."""
    idx = len(body)
    for rx in QUOTE_MARKERS:
        m = rx.search(body)
        if m and 0 < m.start() < idx:
            idx = m.start()
    return body[:idx]

NOISE_SUBJECT_PREFIXES = [
    "re:", "fwd:", "reminder:", "[important]", "[urgent]", "invitation:", "invite:", "update:",
]


def _clean_title(subject: str) -> str:
    t = subject.strip()
    changed = True
    while changed:
        changed = False
        for p in NOISE_SUBJECT_PREFIXES:
            if t.lower().startswith(p):
                t = t[len(p):].strip()
                changed = True
    return t or subject


def _kw_hit(kw: str, text: str) -> bool:
    if kw == "due":  # "due by 20th" yes, "postponed due to rain" no
        return re.search(r"\bdue\b(?!\s+to\b)", text) is not None
    return re.search(r"\b" + re.escape(kw) + r"\b", text) is not None


def _score_categories(subject: str, body: str, has_venue: bool, has_time: bool) -> dict:
    """Weighted keyword scoring. A subject hit counts 3x a body hit."""
    subj, bod = subject.lower(), body.lower()
    scores = {}
    for cat, kws in CATEGORY_KEYWORDS.items():
        s = 0
        for kw, w in kws.items():
            if _kw_hit(kw, subj):
                s += w * 3
            elif _kw_hit(kw, bod):
                s += w
        scores[cat] = s

    # A dated invitation with a room AND a start time is an event, even if it
    # also says "register by" — don't let that make it an assignment.
    if has_venue and has_time:
        scores["assignment"] = max(0, scores["assignment"] - 6)
    return scores


def _classify(subject: str, body: str, has_venue: bool, has_time: bool):
    """Keyword-only classification (tier 3). Returns (category, scored)."""
    scores = _score_categories(subject, body, has_venue, has_time)
    best = max(scores, key=lambda c: scores[c])
    if scores[best] > 0:
        return best, True      # some event-type keyword was present
    return "other", False      # no evidence — per SETUP1.md, don't guess


def _domain_label(sender: str) -> str:
    """Friendly fallback label from the sender's domain, so unknown senders
    still group usefully in the Sources filter instead of all being 'Others'."""
    m = re.search(r"@([\w.-]+)", sender or "")
    if not m:
        return DEFAULT_LABEL
    host = m.group(1).lower()
    if "iima" in host:            # any campus address we have no rule for
        return DEFAULT_LABEL
    parts = [p for p in host.split(".")
             if p not in ("com", "in", "org", "net", "co", "ac", "edu", "gov", "io")]
    name = parts[-1] if parts else host
    if name in ("gmail", "googlemail", "yahoo", "outlook", "hotmail", "proton", "icloud"):
        return "Personal mail"
    return name.replace("-", " ").title()


def classify_message(sender="", to="", cc="", subject="", body="", labels=None,
                     has_venue=False, has_time=False):
    """
    Four-tier classification, most certain first.

      Tier 1   label already applied by the user's own Gmail filters
      Tier 2   hard-coded rule engine built from gmail_filters_import.xml
      Tier 2b  generic sender rules (LinkedIn, Unstop, Coursera, banks, …)
      Tier 3   weighted keyword scoring (the LLM slot in production)

    Returns dict: source_label, label_source, category, layer, allowed, scored
    """
    known = set(LABEL_MAP_KEYS)
    label, tier = None, "fallback"
    category = layer = None
    allowed = True

    # Tier 1 — trust a label Gmail already applied.
    for l in labels or []:
        if l in known:
            label, tier = l, "gmail_label"
            break

    # Tier 2 — our own copy of the IIMA filter rules.
    if label is None:
        matched, _title = RULES.classify(sender=sender, to=to, cc=cc,
                                         subject=subject, body=body, labels=labels)
        if matched:
            label, tier = matched, "rule"

    if label is not None:
        category, layer, allowed = label_info(label)

    # Tier 2b — well-known non-IIMA senders (personal Gmail accounts).
    if label is None:
        low_sender = (sender or "").lower()
        for pattern, glabel, gcat, glayer, gallowed in GENERIC_SENDER_RULES:
            if re.search(pattern, low_sender):
                label, tier = glabel, "generic"
                category, layer, allowed = gcat, glayer, gallowed
                break

    # Tier 3 — keyword scoring. Decides the category, and for unknown senders
    # everything. Per SETUP1.md we prefer "other" over a confident wrong guess.
    kw_cat, scored = _classify(subject, body, has_venue, has_time)
    scores = _score_categories(subject, body, has_venue, has_time)
    best_score = max(scores.values()) if scores else 0

    if label is None:
        label, tier = _domain_label(sender), "fallback"
        category, layer = kw_cat, "shared"
        allowed = True
    elif scored:
        # A weak/generic label yields to any keyword evidence; a specific label
        # only yields to a strong high-stakes signal (a quiz announced by a club
        # is still a quiz).
        if category in WEAK_CATEGORIES and kw_cat not in WEAK_CATEGORIES:
            category = kw_cat
        elif category in ACTIVITY_CATEGORIES and kw_cat in ACTIVITY_CATEGORIES:
            category = kw_cat          # content decides which kind of activity
        else:
            for cat in OVERRIDE_CATEGORIES:
                if scores.get(cat, 0) >= OVERRIDE_MIN_SCORE and scores[cat] == best_score:
                    category = cat
                    break

    # Personal-intent override: broadcast label, but clearly aimed at me.
    text = (subject + " " + body).lower()
    if allowed and any(h in text for h in PERSONAL_HINTS):
        layer = "personal"

    return {
        "source_label": label,
        "label_source": tier,
        "category": category or "other",
        "layer": layer or "shared",
        "allowed": allowed,
        "scored": scored,
    }


def _parse_date(text: str, ref: date):
    """Find the most likely event date.
    Returns (date|None, explicit: bool) — explicit means a written-out date
    like '18 July' or '18/07/2026', not 'tomorrow' / 'this Friday'."""
    low = text.lower()

    # 1. Explicit: "18th July", "July 18, 2026", "18 July 2026"
    m = re.search(
        r"\b(\d{1,2})(?:st|nd|rd|th)?\s+"
        r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s*(\d{4})?", low)
    if m:
        day, mon, yr = int(m.group(1)), MONTHS[m.group(2)], m.group(3)
        year = int(yr) if yr else ref.year
        try:
            d = date(year, mon, day)
            if not yr and (d - ref).days < -60:  # long past → they meant next year
                d = date(year + 1, mon, day)
            return d, True
        except ValueError:
            pass

    # 2. "July 18" / "July 18th, 2026"
    m = re.search(
        r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+"
        r"(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?", low)
    if m:
        mon, day, yr = MONTHS[m.group(1)], int(m.group(2)), m.group(3)
        year = int(yr) if yr else ref.year
        try:
            d = date(year, mon, day)
            if not yr and (d - ref).days < -60:
                d = date(year + 1, mon, day)
            return d, True
        except ValueError:
            pass

    # 3. Numeric: 18/07/2026, 18-07-26, 18.07.2026 (day-first, Indian convention)
    m = re.search(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b", low)
    if m:
        day, mon, yr = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if yr < 100:
            yr += 2000
        try:
            return date(yr, mon, day), True
        except ValueError:
            pass

    # 4. Relative words (NOT explicit — fine for manual add, too weak for auto-add)
    if "day after tomorrow" in low:
        return ref + timedelta(days=2), False
    if "tomorrow" in low:
        return ref + timedelta(days=1), False
    if re.search(r"\btoday\b|\btonight\b|\bthis evening\b", low):
        return ref, False

    # 5. Weekday: "this Friday", "on Monday", "next Tuesday" (also not explicit)
    m = re.search(r"\b(this|next|on|coming)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", low)
    if m:
        target = WEEKDAYS[m.group(2)]
        delta = (target - ref.weekday()) % 7
        if delta == 0:
            delta = 7 if m.group(1) == "next" else 0
        if m.group(1) == "next" and delta < 7:
            delta += 7 if delta == 0 else 0
        return ref + timedelta(days=delta), False

    return None, False


def _parse_times(text: str):
    """Returns (start_time, end_time) as 'HH:MM' strings or None."""
    low = text.lower()

    # Range with shared meridiem: "5–7 PM", "5 to 7 pm", "5:30-6:30 pm", "6.30-7.30 pm"
    m = re.search(
        r"\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b", low)
    if m:
        h1, m1, mer1 = int(m.group(1)), int(m.group(2) or 0), m.group(3)
        h2, m2, mer2 = int(m.group(4)), int(m.group(5) or 0), m.group(6)
        mer1 = mer1 or mer2
        s = _to24(h1, m1, mer1)
        e = _to24(h2, m2, mer2)
        return s, e

    # Single 12h time: "at 5 PM", "5:30pm", "6.30 pm" (Indian dot style)
    m = re.search(r"\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b", low)
    if m:
        return _to24(int(m.group(1)), int(m.group(2) or 0), m.group(3)), None

    # 24h time: "17:00 hrs"
    m = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", low)
    if m:
        return f"{int(m.group(1)):02d}:{m.group(2)}", None

    # Military style: "1730 hrs"
    m = re.search(r"\b([01]\d|2[0-3])([0-5]\d)\s*(?:hrs|hours)\b", low)
    if m:
        return f"{m.group(1)}:{m.group(2)}", None

    # Words
    if re.search(r"\bnoon\b", low):
        return "12:00", None
    if re.search(r"\bmidnight\b", low):
        return "23:59", None

    return None, None


def _to24(h, mi, mer):
    if mer == "pm" and h != 12:
        h += 12
    if mer == "am" and h == 12:
        h = 0
    return f"{h:02d}:{mi:02d}"


def _parse_venue(text: str):
    # Explicit label: "Venue: RJM Auditorium"
    m = re.search(r"venue\s*[:\-–]\s*([^\n.,;!]+)", text, re.I)
    if m:
        return m.group(1).strip()[:60]
    # Known campus locations mentioned anywhere
    for v in CAMPUS_VENUES:
        if re.search(re.escape(v), text, re.I):
            return v
    # "at <Capitalised Place>" heuristic
    m = re.search(r"\bat\s+((?:[A-Z][\w'&-]*\s?){1,4}(?:Hall|Room|Auditorium|Ground|Lawn|Plaza|Block|Steps))", text)
    if m:
        return m.group(1).strip()
    return None


def extract_event(subject: str, body: str, received_at: datetime,
                  sender: str = "", to: str = "", cc: str = "",
                  labels: list | None = None) -> dict:
    """Extract a structured EventDraft from a raw email. See LLM SLOT note above.

    Sender/recipient/labels feed the three-tier classifier; if they are omitted
    the function still works and falls back to keyword classification."""
    ref = received_at.date()
    clean_body = strip_quoted(body)          # quoted replies can't create events
    full = subject + "\n" + clean_body

    event_date, date_explicit = _parse_date(full, ref)
    start, end = _parse_times(full)
    venue = _parse_venue(full)
    title = _clean_title(subject)
    links = extract_links(clean_body)

    cls = classify_message(
        sender=sender, to=to, cc=cc, subject=subject, body=clean_body,
        labels=labels, has_venue=venue is not None, has_time=start is not None,
    )

    found = sum(x is not None for x in [event_date, start, venue])
    confidence = round(0.4 + 0.2 * found, 2)  # 0.4 – 1.0
    if event_date and not date_explicit:
        confidence = round(max(0.4, confidence - 0.1), 2)  # vague dates are less sure
    if cls["label_source"] in ("gmail_label", "rule"):
        confidence = round(min(1.0, confidence + 0.1), 2)  # known sender → surer

    # Any event language at all? Used by the auto-add gate.
    low = full.lower()
    has_signal = cls["scored"] or any(w in low for w in EVENT_SIGNAL_WORDS)

    return {
        "title": title,
        "category": cls["category"],
        "date": event_date.isoformat() if event_date else None,
        "start_time": start,
        "end_time": end,
        "venue": venue,
        "links": links,
        "confidence": confidence,
        "parseable": event_date is not None,
        "date_explicit": date_explicit,
        "category_scored": has_signal,
        "source_label": cls["source_label"],
        "label_source": cls["label_source"],
        "layer": cls["layer"],
        "allowed": cls["allowed"],
    }
