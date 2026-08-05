"""
Sanity checks for the classification pipeline.

    python test_classification.py

No pytest needed — plain asserts so it runs anywhere Python does.
Covers: every rule in the XML, category assignment, layer routing,
the denylist, link extraction, and the auto-add surety gate.
"""
from datetime import datetime, date, timedelta

from categories import LABEL_MAP
from links import extract_links
from parser import extract_event
from rules_engine import RULES

NOW = datetime.now()
SOON = (date.today() + timedelta(days=6)).strftime("%d %B %Y")

PASS, FAIL = [], []


def check(name, got, want):
    (PASS if got == want else FAIL).append((name, got, want))


def gate(d):
    """Mirrors the auto-add gate in main.gmail_sync — keep the two in sync."""
    if not d["allowed"]:
        return "deny"
    if not d["parseable"]:
        return "skip"
    if not (d["start_time"] or d["venue"] or d["category_scored"]):
        return "skip"
    if not d["date_explicit"] and not (d["start_time"] or d["venue"]):
        return "skip"
    if date.fromisoformat(d["date"]) < date.today():
        return "past"
    return "auto"


# ── 1. every XML rule maps to a label we know ───────────────────────────────
def test_rule_coverage():
    labels = {r["label"] for r in RULES.rules}
    for l in labels:
        check(f"label known: {l}", l in LABEL_MAP, True)
    check("rules loaded", len(RULES.rules) >= 21, True)


# ── 2. sender / subject-tag routing ─────────────────────────────────────────
ROUTING = [
    # (sender, subject, expected label, expected category, expected layer)
    ("pgpexams@iima.ac.in", "Quiz 2 — Marketing", "IIMA/Exam Notices", "exam", "personal"),
    ("noreply@iima.ac.in", "Assignment 3 Due on Friday", "IIMA/Assignments & Quizzes", "assignment", "personal"),
    ("noreply@iima.ac.in", "New post in the OB forum", "IIMA/Course Forums", "class", "personal"),
    ("no-reply@coursera.org", "Course update", "IIMA/Assignments & Quizzes", "assignment", "personal"),
    ("acads@iima.ac.in", "REM session for Stats", "IIMA/REM & Doubt Sessions", "class", "personal"),
    ("pgp@iima.ac.in", "Term II registration", "IIMA/Section Admin", "admin", "personal"),
    ("skynet@iima.ac.in", "[PLACECOM] BCG PPT", "IIMA/Placement Committee", "placement", "personal"),
    ("consultclub@iima.ac.in", "Case prep drill", "IIMA/Career Clubs", "workshop", "shared"),
    ("beta@iima.ac.in", "Valuation masterclass", "IIMA/Career Clubs", "workshop", "shared"),
    ("speakerseries@iima.ac.in", "Guest lecture", "IIMA/Seminars & Talks", "talk", "shared"),
    ("anyone@iima.ac.in", "[Seminar NB] Research talk", "IIMA/Seminars & Talks", "talk", "shared"),
    ("cultcomm@iima.ac.in", "Annual play auditions", "IIMA/Other Clubs", "club_event", "shared"),
    ("sportscomm@iima.ac.in", "Football league", "IIMA/Other Clubs", "club_event", "shared"),
    ("ccc@iima.ac.in", "Wi-Fi open house", "IIMA/Other Clubs", "club_event", "shared"),
    ("sao@iima.ac.in", "Power maintenance", "IIMA/Hostel & Facilities", "admin", "shared"),
    ("panacea@iima.ac.in", "Yoga session", "IIMA/Wellness", "admin", "shared"),
    ("sjc@iima.ac.in", "Council meeting", "IIMA/Student Governance", "admin", "shared"),
    ("anyone@iima.ac.in", "[Gen NB] Lost and found", "IIMA/General Notice Board", "admin", "shared"),
    ("librarian@iima.ac.in", "Book due", "IIMA/Library", "admin", "shared"),
    ("info@the-ken.com", "The Nutgraf", "IIMA/The Ken", "other", "shared"),
    ("forms-receipts-noreply@google.com", "Thanks for filling in", "IIMA/Form Receipts", "other", "personal"),
    ("no-reply-rtionline@nic.in", "RTI update", "IIMA/Personal & Govt", "other", "personal"),
    ("stranger@gmail.com", "Random mail", "Personal mail", "other", "shared"),
    ("unknown@iima.ac.in", "Random campus mail", "IIMA/Others", "other", "shared"),
    ("jobs@linkedin.com", "Your job alert", "Jobs & Recruiting", "placement", "personal"),
    ("no-reply@unstop.com", "Case challenge registrations", "Jobs & Recruiting", "placement", "personal"),
    ("info@meetup.com", "Ahmedabad meetup", "Events & Meetups", "club_event", "shared"),
    ("noreply@udemy.com", "Continue your course", "Courses & Learning", "class", "personal"),
    ("alerts@hdfcbank.net", "Bill payment due", "Bills & Payments", "admin", "personal"),
]


def test_routing():
    for sender, subject, want_label, want_cat, want_layer in ROUTING:
        d = extract_event(subject, f"Details: the session is on {SOON} at 5:00 PM in CR-2.",
                          NOW, sender=sender)
        check(f"label  [{subject[:28]}]", d["source_label"], want_label)
        check(f"cat    [{subject[:28]}]", d["category"], want_cat)
        # layer only meaningful for mails that may create events
        if d["allowed"]:
            check(f"layer  [{subject[:28]}]", d["layer"], want_layer)


# ── 3. denylist never creates events ────────────────────────────────────────
def test_denylist():
    for sender in ["info@the-ken.com", "forms-receipts-noreply@google.com",
                   "no-reply-rtionline@nic.in", "librarian@iima.ac.in"]:
        d = extract_event("Event on campus", f"Join us on {SOON} at 6:00 PM at KLMDC.",
                          NOW, sender=sender)
        check(f"denylist blocks {sender}", gate(d), "deny")


# ── 4. tier 1: a Gmail label already applied wins ───────────────────────────
def test_gmail_label_tier():
    d = extract_event("Some subject", "Body", NOW,
                      sender="stranger@gmail.com", labels=["IIMA/Exam Notices"])
    check("gmail label tier used", d["label_source"], "gmail_label")
    check("gmail label category", d["category"], "exam")


# ── 5. high-stakes keyword override ─────────────────────────────────────────
def test_override():
    d = extract_event("Quiz 1 for the club certification",
                      f"The quiz will be held on {SOON} at 7:00 PM in CR-1.",
                      NOW, sender="consultclub@iima.ac.in")
    check("override club→exam", d["category"], "exam")


# ── 6. surety gate ──────────────────────────────────────────────────────────
def test_gate():
    cases = [
        ("Quiz 2", f"Quiz on {SOON}.", "auto", "explicit date + exam keyword"),
        ("Team dinner", "Dinner tomorrow at 8 PM", "auto", "vague date but time pins it"),
        ("Catch up", "Let's catch up sometime tomorrow", "skip", "vague date, nothing else"),
        ("Monthly report", f"Report for the period ending {SOON}.", "skip", "no event language"),
        ("Talk", f"Session on {SOON} at 6 PM at KLMDC", "auto", "date+time+venue"),
        ("Old event", "Session on 3 January 2020 at 5 PM", "past", "past date"),
    ]
    for subject, body, want, why in cases:
        d = extract_event(subject, body, NOW, sender="ccc@iima.ac.in")
        check(f"gate: {why}", gate(d), want)


# ── 7. quoted replies must not create events ────────────────────────────────
def test_quoted():
    body = ("Thanks, noted!\n\nOn Fri, 18 Jul 2026 at 10:00, PGP Office wrote:\n"
            f"> Quiz on {SOON} at 5 PM in CR-2")
    d = extract_event("Re: Quiz details", body, NOW, sender="ananya@iima.ac.in")
    check("quoted reply ignored", d["parseable"], False)


# ── 8. link extraction ──────────────────────────────────────────────────────
def test_links():
    body = ("Register here: https://forms.gle/abc123\n"
            "Join online at https://meet.google.com/xyz-abcd\n"
            "Slides: https://drive.google.com/file/d/1\n"
            "Unsubscribe: https://mailchimp.com/unsubscribe?u=1")
    links = extract_links(body)
    kinds = [l["kind"] for l in links]
    check("register link first", kinds[0], "register")
    check("meeting link found", "meeting" in kinds, True)
    check("unsubscribe dropped", any("unsubscribe" in l["url"] for l in links), False)
    check("link count", len(links), 3)

    d = extract_event("Fest", f"Fest on {SOON} at 6 PM. Register: https://forms.gle/x1",
                      NOW, sender="cultcomm@iima.ac.in")
    check("links reach the draft", len(d["links"]), 1)


# ── 9. time formats ─────────────────────────────────────────────────────────
def test_times():
    cases = [("at 6:30 PM", "18:30"), ("at 6.30 pm", "18:30"),
             ("at 1730 hrs", "17:30"), ("at noon", "12:00"), ("at 9 AM", "09:00")]
    for text, want in cases:
        d = extract_event("Session", f"Session on {SOON} {text} in CR-1.", NOW,
                          sender="ccc@iima.ac.in")
        check(f"time {text}", d["start_time"], want)


if __name__ == "__main__":
    for fn in [test_rule_coverage, test_routing, test_denylist, test_gmail_label_tier,
               test_override, test_gate, test_quoted, test_links, test_times]:
        fn()

    for name, got, want in FAIL:
        print(f"FAIL  {name}\n        got  {got!r}\n        want {want!r}")
    print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
    raise SystemExit(1 if FAIL else 0)
