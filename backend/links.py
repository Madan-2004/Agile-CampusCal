"""
Link extraction — pulls registration / meeting / resource URLs out of a mail so
they can be attached to the calendar event. A student then registers straight
from the event instead of hunting for the original mail.
"""
import re

URL_RE = re.compile(r"""(https?://[^\s<>"'\)\]]+|www\.[^\s<>"'\)\]]+)""", re.I)

REGISTER_DOMAINS = (
    "forms.gle", "docs.google.com/forms", "forms.office.com", "lu.ma",
    "typeform.com", "airtable.com", "eventbrite", "unstop.com", "d2c.iima",
)
MEETING_DOMAINS = ("meet.google.com", "zoom.us", "teams.microsoft.com", "webex.com")
RESOURCE_DOMAINS = (
    "drive.google.com", "docs.google.com", "sheets.google.com", "dropbox.com",
    "onedrive", "sharepoint", "iima.ac.in",
)

# Never surface these — tracking, list management, image beacons.
DROP_PATTERNS = (
    "unsubscribe", "optout", "opt-out", "list-manage", "mailchimp",
    "googleusercontent.com", "tracking", "/track/", "utm_medium=email&utm_",
    "notifications/settings", "email_preferences", "manage-preferences",
)
DROP_EXT = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico")

# Words that, when they appear near a URL, mark it as a registration link.
REGISTER_WORDS = (
    "register", "registration", "rsvp", "sign up", "signup", "apply", "apply here",
    "fill the form", "fill this form", "fill out", "nominate", "enrol", "enroll",
    "book your", "reserve", "submit your", "form link", "click here to register",
)
PROXIMITY = 140  # characters either side of the URL to inspect


def _clean(url: str) -> str:
    url = url.rstrip(".,;:!?)]}>'\"")
    if url.lower().startswith("www."):
        url = "https://" + url
    return url


def _kind(url: str, context: str) -> str:
    low = url.lower()
    ctx = context.lower()
    if any(d in low for d in MEETING_DOMAINS):
        return "meeting"
    if any(d in low for d in REGISTER_DOMAINS):
        return "register"
    if any(w in ctx for w in REGISTER_WORDS):
        return "register"
    if any(d in low for d in RESOURCE_DOMAINS):
        return "resource"
    return "resource"


def _label(kind: str) -> str:
    return {"register": "Register", "meeting": "Join online", "resource": "Open link"}[kind]


RANK = {"register": 0, "meeting": 1, "resource": 2}


def extract_links(body: str, max_links: int = 5) -> list[dict]:
    """Returns [{url, kind, label}] ranked register → meeting → resource."""
    if not body:
        return []
    out, seen = [], set()

    for m in URL_RE.finditer(body):
        raw = _clean(m.group(0))
        low = raw.lower()
        if any(p in low for p in DROP_PATTERNS) or low.endswith(DROP_EXT):
            continue
        norm = low.rstrip("/")
        if norm in seen:
            continue
        seen.add(norm)

        start = max(0, m.start() - PROXIMITY)
        context = body[start:m.end() + PROXIMITY]
        kind = _kind(raw, context)
        out.append({"url": raw, "kind": kind, "label": _label(kind)})

    out.sort(key=lambda l: RANK[l["kind"]])
    return out[:max_links]


def primary_link(links: list[dict]) -> dict | None:
    """The one link worth a button on the event card."""
    for kind in ("register", "meeting"):
        for l in links or []:
            if l["kind"] == kind:
                return l
    return None
