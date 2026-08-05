"""
CampusCal taxonomy — two independent axes.

1. SOURCE LABEL  (18 values) — WHO sent it. Comes straight from the IIMA Gmail
   filter set (gmail_filters_import.xml). Stored on the event, shown as a chip,
   usable as a secondary filter.
2. CATEGORY      (9 values)  — WHAT KIND of thing it is. Drives the colour on
   the calendar. Kept small on purpose: 18 colours on a month grid is unreadable.

This file is the single place to edit if the taxonomy changes.
"""

# ── Calendar categories (colour = frontend src/utils.js must match) ──────────
CATEGORIES = [
    "exam",        # quizzes, mid-terms, end-terms
    "assignment",  # submissions, due dates, Turnitin/Coursera
    "class",       # lectures, REM, doubt sessions, make-up classes
    "placement",   # PLACECOM, PPTs, interview slots
    "workshop",    # career-club sessions, training, case prep
    "talk",        # seminars, speaker series, fireside chats
    "club_event",  # fests, cultural, sports, club broadcasts
    "admin",       # notices, facilities, governance, wellness
    "other",       # genuinely ambiguous — never guessed into something specific
]

# ── Source label → (category, layer, allowed_to_create_events) ───────────────
# layer: "personal" = mail aimed at me as a student
#        "shared"   = broadcast anyone on campus may attend
# allowed=False is the denylist: newsletters/receipts never create events at all.
LABEL_MAP = {
    "IIMA/Exam Notices":            ("exam",       "personal", True),
    "IIMA/Assignments & Quizzes":   ("assignment", "personal", True),
    "IIMA/REM & Doubt Sessions":    ("class",      "personal", True),
    "IIMA/Course Forums":           ("class",      "personal", True),
    "IIMA/Section Admin":           ("admin",      "personal", True),
    "IIMA/Placement Committee":     ("placement",  "personal", True),

    "IIMA/Seminars & Talks":        ("talk",       "shared",   True),
    "IIMA/Career Clubs":            ("workshop",   "shared",   True),
    "IIMA/Other Clubs":             ("club_event", "shared",   True),
    "IIMA/General Notice Board":    ("admin",      "shared",   True),
    "IIMA/SIF":                     ("admin",      "shared",   True),
    "IIMA/Student Governance":      ("admin",      "shared",   True),
    "IIMA/Hostel & Facilities":     ("admin",      "shared",   True),
    "IIMA/Wellness":                ("admin",      "shared",   True),

    # Denylist — recurring noise that must never reach a calendar.
    "IIMA/Library":                 ("admin",      "shared",   False),
    "IIMA/The Ken":                 ("other",      "shared",   False),
    "IIMA/Personal & Govt":         ("other",      "personal", False),
    "IIMA/Form Receipts":           ("other",      "personal", False),

    # Fallback bucket used when nothing matched (see SETUP1.md: prefer
    # "Others" over a confident wrong guess).
    "IIMA/Others":                  ("other",      "shared",   True),
}

DEFAULT_LABEL = "IIMA/Others"

# ── Tier 2b: generic (non-IIMA) senders ─────────────────────────────────────
# The XML only knows @iima.ac.in addresses. A student signed in with a personal
# Gmail would otherwise see everything as "Others", so these rules cover the
# common real-world senders. (regex on the address, label, category, layer, allowed)
GENERIC_SENDER_RULES = [
    (r"linkedin\.com|naukri|unstop|internshala|indeed|glassdoor|hirist|cutshort|"
     r"apna\.co|shine\.com|instahyre|foundit",
     "Jobs & Recruiting", "placement", "personal", True),

    (r"coursera|udemy|edx\.org|upgrad|greatlearning|swayam|nptel|khanacademy|"
     r"datacamp|pluralsight|simplilearn|turnitin",
     "Courses & Learning", "class", "personal", True),

    (r"eventbrite|meetup\.com|lu\.ma|townscript|insider\.in|bookmyshow|allevents|"
     r"konfhub|devfolio|hackerearth|devpost",
     "Events & Meetups", "club_event", "shared", True),

    (r"calendar-noreply@google|@zoom\.us|teams\.microsoft|webex|calendly|"
     r"meetings@|scheduling@",
     "Meetings & Invites", "other", "personal", True),

    (r"paytm|razorpay|phonepe|hdfcbank|icicibank|@sbi|axisbank|kotak|billdesk|"
     r"upi@|@irctc|electricity|policybazaar|lic\.",
     "Bills & Payments", "admin", "personal", True),

    # Noise that should never reach a calendar.
    (r"substack|medium\.com|newsletter|nytimes|economist|livemint|inshorts|"
     r"morningbrew|quora|pinterest|@meta\.com|instagram|facebookmail|twitter|x\.com",
     "Newsletters & Social", "other", "shared", False),

    (r"amazon|flipkart|swiggy|zomato|blinkit|myntra|zepto|bigbasket|dunzo|"
     r"uber|ola|rapido|delivery|shipment|order-update",
     "Orders & Delivery", "other", "personal", False),

    (r"github|gitlab|stackoverflow|npmjs|vercel|netlify|atlassian|notion\.so|"
     r"slack\.com|figma",
     "Tools & Services", "other", "personal", False),

    (r"noreply@google\.com|accounts\.google|security-noreply|no-reply@apple|"
     r"microsoft\.com|@openai|@anthropic",
     "Accounts & Security", "other", "personal", False),
]

# Categories so generic that ANY keyword evidence should replace them
# (e.g. a "Meetings & Invites" mail that is clearly an interview).
# "admin" is deliberately NOT here: a bill with "payment due" is an admin
# notice, not a coursework assignment.
WEAK_CATEGORIES = ("other",)

# Human-friendly short names for the UI chips.
LABEL_SHORT = {k: k.replace("IIMA/", "") for k in LABEL_MAP}

# ── Personal-intent overrides ───────────────────────────────────────────────
# Phrases that mean "this concerns me specifically", even on a broadcast label.
PERSONAL_HINTS = [
    "placecom", "shortlist", "shortlisted", "interview slot", "your interview",
    "study group", "team meet", "your application", "you have been selected",
    "roll number", "your submission", "your slot has been",
]

# Categories important enough that a strong keyword signal overrides the
# label-derived category (a quiz announced by a club is still a quiz).
OVERRIDE_CATEGORIES = ("exam", "assignment", "placement")
OVERRIDE_MIN_SCORE = 6  # ≥ one subject-line hit of a weight-2 keyword

# These three are all "an activity is happening" — which one it is depends on
# the content, not the sender. A Career Club running a case competition is a
# club_event; the same club running a prep session is a workshop.
ACTIVITY_CATEGORIES = ("workshop", "club_event", "talk")


def label_info(label: str):
    """(category, layer, allowed) for a source label, with a safe default."""
    return LABEL_MAP.get(label, LABEL_MAP[DEFAULT_LABEL])
