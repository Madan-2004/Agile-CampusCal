"""
CampusCal — One calendar for IIMA. FastAPI backend.

Architecture (mirrors the real design):
  Gmail push subscription  →  simulated here by the seeded inbox + /simulate/new-email
  LLM extraction           →  parser.extract_event()  (see LLM SLOT in parser.py)
  Google Calendar write    →  simulated by the events table (shared + personal layers)
"""
import json
import random
from datetime import datetime, date

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from categories import CATEGORIES, LABEL_MAP, LABEL_SHORT
from database import Base, engine, get_db
from models import Email, Event
from parser import classify_message, extract_event
from seed import seed_emails, LIVE_EMAILS

Base.metadata.create_all(bind=engine)

# Lightweight migrations — safe to run on every boot, no data loss.
for _col, _type in [
    ("external_ref", "VARCHAR"),
    ("source_label", "VARCHAR"),
    ("links", "TEXT"),
    ("gcal_event_id", "VARCHAR"),
]:
    with engine.connect() as _conn:
        try:
            _conn.execute(text(f"ALTER TABLE events ADD COLUMN {_col} {_type}"))
            _conn.commit()
        except Exception:
            pass  # column already exists

app = FastAPI(title="CampusCal API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- pipeline
def run_shared_pipeline(db: Session) -> list[Event]:
    """Layer 1: process unhandled OFFICIAL emails into shared calendar events.
    In production this fires on a Gmail push notification within seconds."""
    created = []
    pending = db.query(Email).filter(Email.is_official == True, Email.processed == False).all()
    for mail in pending:
        draft = extract_event(mail.subject, mail.body, mail.received_at,
                              sender=mail.sender_email)
        mail.processed = True
        if draft["parseable"] and draft["allowed"]:
            ev = Event(
                title=draft["title"],
                category=draft["category"],
                date=date.fromisoformat(draft["date"]),
                start_time=draft["start_time"],
                end_time=draft["end_time"],
                venue=draft["venue"],
                layer=draft["layer"],
                confidence=draft["confidence"],
                source_email_id=mail.id,
                source_label=draft["source_label"],
                links=json.dumps(draft["links"]) if draft["links"] else None,
            )
            db.add(ev)
            created.append(ev)
    db.commit()
    return created


@app.on_event("startup")
def startup():
    db = next(get_db())
    if seed_emails(db):
        run_shared_pipeline(db)  # first boot: pipeline catches up on the inbox
    db.close()


# ---------------------------------------------------------------- emails
@app.get("/api/emails")
def list_emails(db: Session = Depends(get_db)):
    mails = db.query(Email).order_by(Email.received_at.desc()).all()
    return [
        {
            "id": m.id,
            "sender_name": m.sender_name,
            "sender_email": m.sender_email,
            "subject": m.subject,
            "snippet": m.body.strip().replace("\n", " ")[:120],
            "body": m.body,
            "received_at": m.received_at.isoformat(),
            "is_official": m.is_official,
            "read": m.read,
            "event_ids": [e.id for e in m.events],
            "personal_event_ids": [e.id for e in m.events if e.layer == "personal"],
            "shared_event_ids": [e.id for e in m.events if e.layer == "shared"],
        }
        for m in mails
    ]


@app.post("/api/emails/{email_id}/read")
def mark_read(email_id: int, db: Session = Depends(get_db)):
    mail = db.get(Email, email_id)
    if not mail:
        raise HTTPException(404, "Email not found")
    mail.read = True
    db.commit()
    return {"ok": True}


@app.post("/api/emails/{email_id}/extract")
def extract_from_email(email_id: int, db: Session = Depends(get_db)):
    """Layer 2: the 'Add to calendar' button. Reads ONLY this one email —
    never the whole inbox — and returns an editable draft for confirmation."""
    mail = db.get(Email, email_id)
    if not mail:
        raise HTTPException(404, "Email not found")
    return extract_event(mail.subject, mail.body, mail.received_at,
                         sender=mail.sender_email)


class ParseIn(BaseModel):
    subject: str
    body: str
    received_at: str | None = None  # ISO datetime; defaults to now
    sender: str | None = None
    to: str | None = None
    cc: str | None = None
    labels: list[str] | None = None


@app.post("/api/parse")
def parse_raw(payload: ParseIn):
    """Extraction for external (real Gmail) mails: parses raw subject+body
    without storing anything. Same engine, same EventDraft shape."""
    ref = datetime.now()
    if payload.received_at:
        try:
            ref = datetime.fromisoformat(payload.received_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            pass
    return extract_event(payload.subject, payload.body, ref,
                         sender=payload.sender or "", to=payload.to or "",
                         cc=payload.cc or "", labels=payload.labels)


class ClassifyItem(BaseModel):
    id: str
    title: str
    text: str | None = ""


class ClassifyIn(BaseModel):
    items: list[ClassifyItem]


@app.post("/api/classify")
def classify_batch(payload: ClassifyIn):
    """Categorise many titles at once — used for Google Calendar events, which
    already have their details and only need a category. One request, no writes."""
    out = []
    for it in payload.items:
        cls = classify_message(subject=it.title, body=it.text or "")
        out.append({"id": it.id, "category": cls["category"], "scored": cls["scored"]})
    return {"results": out}


@app.get("/api/taxonomy")
def taxonomy():
    """Category and source-label vocabulary, so the UI never hard-codes it."""
    return {
        "categories": CATEGORIES,
        "labels": [
            {"label": k, "short": LABEL_SHORT[k], "category": v[0],
             "layer": v[1], "allowed": v[2]}
            for k, v in LABEL_MAP.items()
        ],
    }


class GmailMailIn(BaseModel):
    external_ref: str
    subject: str
    body: str
    received_at: str | None = None
    sender: str | None = None
    to: str | None = None
    cc: str | None = None
    labels: list[str] | None = None


class GmailSyncIn(BaseModel):
    mails: list[GmailMailIn]


@app.post("/api/gmail/sync")
def gmail_sync(payload: GmailSyncIn, db: Session = Depends(get_db)):
    """Auto-pipeline for the signed-in user's real Gmail. Parses each mail,
    skips ones already synced (dedupe on Gmail message id), and routes:
    personal-intent events → 'personal' layer, general events → 'shared'."""
    created_shared, created_personal, skipped = 0, 0, 0
    seen: set[str] = set()
    for m in payload.mails:
        if m.external_ref in seen:
            continue
        seen.add(m.external_ref)
        if db.query(Event).filter(Event.external_ref == m.external_ref).count():
            continue  # already synced on a previous login

        ref = datetime.now()
        if m.received_at:
            try:
                ref = datetime.fromisoformat(m.received_at.replace("Z", "+00:00")).replace(tzinfo=None)
            except ValueError:
                pass

        draft = extract_event(m.subject, m.body, ref, sender=m.sender or "",
                              to=m.to or "", cc=m.cc or "", labels=m.labels)
        # Denylist: newsletters, receipts, Govt/account mail never make events.
        if not draft["allowed"]:
            skipped += 1
            continue
        # ── Auto-add gate: only events we're SURE about ──────────────
        #  1. an explicitly written date ("21 July", "21/07") — never
        #     "tomorrow"/"this Friday", which too often refer to the
        #     send date or casual chatter, not a real event;
        #  2. plus at least one of: a start time or a venue;
        #  3. the event must not already be in the past.
        # Everything weaker stays manual via the Add-to-calendar button.
        if not draft["parseable"]:
            skipped += 1
            continue
        # Corroborating signal: a time, a venue, or event-type language.
        has_signal = (
            draft["start_time"] is not None
            or draft["venue"] is not None
            or draft["category_scored"]
        )
        if not has_signal:
            skipped += 1
            continue
        # A vague date ("tomorrow", "this Friday") is only trusted when the mail
        # also pins down a time or a place — otherwise it's usually chatter.
        if not draft["date_explicit"] and not (draft["start_time"] or draft["venue"]):
            skipped += 1
            continue
        ev_date = date.fromisoformat(draft["date"])
        if ev_date < date.today():
            skipped += 1
            continue
        # Same event announced twice (reminder mails) → don't duplicate.
        if db.query(Event).filter(Event.title == draft["title"], Event.date == ev_date).count():
            skipped += 1
            continue

        # Layer comes from the source label (Exam Notices → mine,
        # Other Clubs → campus), with personal-intent phrases overriding.
        personal = draft["layer"] == "personal"
        db.add(Event(
            title=draft["title"],
            category=draft["category"],
            date=ev_date,
            start_time=draft["start_time"],
            end_time=draft["end_time"],
            venue=draft["venue"],
            layer=draft["layer"],
            confidence=draft["confidence"],
            external_ref=m.external_ref,
            source_label=draft["source_label"],
            links=json.dumps(draft["links"]) if draft["links"] else None,
        ))
        if personal:
            created_personal += 1
        else:
            created_shared += 1
    db.commit()
    return {"created_shared": created_shared, "created_personal": created_personal, "skipped": skipped}


# ---------------------------------------------------------------- events
class EventIn(BaseModel):
    title: str
    category: str = "other"
    date: str                      # ISO yyyy-mm-dd
    start_time: str | None = None
    end_time: str | None = None
    venue: str | None = None
    layer: str = "personal"
    confidence: float = 1.0
    source_email_id: int | None = None
    external_ref: str | None = None
    source_label: str | None = None
    links: list[dict] | None = None


@app.get("/api/events")
def list_events(
    layer: str | None = Query(None, description="shared | personal"),
    db: Session = Depends(get_db),
):
    q = db.query(Event)
    if layer:
        q = q.filter(Event.layer == layer)
    return [e.to_dict() for e in q.order_by(Event.date, Event.start_time).all()]


@app.post("/api/events", status_code=201)
def create_event(body: EventIn, db: Session = Depends(get_db)):
    ev = Event(
        title=body.title.strip(),
        category=body.category,
        date=date.fromisoformat(body.date),
        start_time=body.start_time,
        end_time=body.end_time,
        venue=body.venue,
        layer=body.layer,
        confidence=body.confidence,
        source_email_id=body.source_email_id,
        external_ref=body.external_ref,
        source_label=body.source_label,
        links=json.dumps(body.links) if body.links else None,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev.to_dict()


class GcalRefIn(BaseModel):
    gcal_event_id: str | None = None


@app.patch("/api/events/{event_id}/gcal")
def set_gcal_ref(event_id: int, body: GcalRefIn, db: Session = Depends(get_db)):
    """Remembers the Google Calendar event id after a push, so repeat pushes
    update instead of duplicating."""
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    ev.gcal_event_id = body.gcal_event_id
    db.commit()
    return ev.to_dict()


@app.delete("/api/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    db.delete(ev)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- demo magic
@app.post("/api/simulate/new-email")
def simulate_new_email(db: Session = Depends(get_db)):
    """Demo button: a 'new' official email arrives → the push-subscription
    pipeline picks it up instantly → event appears on the shared calendar."""
    existing_subjects = {m.subject for m in db.query(Email).all()}
    candidates = [e for e in LIVE_EMAILS if e["subject"] not in existing_subjects]
    if not candidates:
        return {"email": None, "events": [], "message": "All demo emails already delivered."}

    data = {**random.choice(candidates)}
    data.setdefault("is_official", True)
    mail = Email(**data, received_at=datetime.now())
    db.add(mail)
    db.commit()

    created = run_shared_pipeline(db)
    return {
        "email": {"id": mail.id, "subject": mail.subject, "sender_name": mail.sender_name},
        "events": [e.to_dict() for e in created],
        "message": f"New mail from {mail.sender_name} parsed and added to the campus calendar.",
    }


@app.get("/api/stats")
def stats(db: Session = Depends(get_db)):
    return {
        "emails": db.query(Email).count(),
        "shared_events": db.query(Event).filter(Event.layer == "shared").count(),
        "personal_events": db.query(Event).filter(Event.layer == "personal").count(),
    }
