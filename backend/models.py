"""ORM models: Email (simulated inbox) and Event (calendar entries)."""
import json

from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)
    sender_name = Column(String, nullable=False)
    sender_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    received_at = Column(DateTime, nullable=False)
    is_official = Column(Boolean, default=False)   # from a monitored campus mailbox
    processed = Column(Boolean, default=False)     # picked up by the shared pipeline
    read = Column(Boolean, default=False)

    events = relationship("Event", back_populates="source_email")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, default="event")     # class | quiz | event | open_house | deadline | workshop
    date = Column(Date, nullable=False)
    start_time = Column(String, nullable=True)     # "17:00"
    end_time = Column(String, nullable=True)
    venue = Column(String, nullable=True)
    layer = Column(String, default="shared")       # shared (campus) | personal (my calendar)
    confidence = Column(Float, default=1.0)        # extraction confidence
    source_email_id = Column(Integer, ForeignKey("emails.id"), nullable=True)
    external_ref = Column(String, nullable=True)   # e.g. Gmail message id for real mails
    source_label = Column(String, nullable=True)   # IIMA/* label the mail was classified as
    links = Column(Text, nullable=True)            # JSON: [{url, kind, label}]
    gcal_event_id = Column(String, nullable=True)  # id after pushing to Google Calendar

    source_email = relationship("Email", back_populates="events")

    def to_dict(self):
        try:
            links = json.loads(self.links) if self.links else []
        except (ValueError, TypeError):
            links = []
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "date": self.date.isoformat(),
            "start_time": self.start_time,
            "end_time": self.end_time,
            "venue": self.venue,
            "layer": self.layer,
            "confidence": self.confidence,
            "source_email_id": self.source_email_id,
            "external_ref": self.external_ref,
            "source_label": self.source_label,
            "links": links,
            "gcal_event_id": self.gcal_event_id,
            "source_sender": self.source_email.sender_name if self.source_email else None,
        }
