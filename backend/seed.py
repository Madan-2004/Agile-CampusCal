"""Seeds the simulated campus inbox.

Senders are the REAL IIMA addresses from gmail_filters_import.xml, so demo mode
exercises exactly the same classification rules as a live Gmail account. Dates
are generated relative to *today* so the demo always looks current.
"""
from datetime import datetime, date, timedelta
from models import Email

TODAY = date.today()


def _d(offset):
    """Pretty date string N days from today, e.g. '21 July 2026'."""
    return (TODAY + timedelta(days=offset)).strftime("%d %B %Y").lstrip("0")


def _recv(days_ago, hour=9, minute=15):
    return datetime.combine(TODAY - timedelta(days=days_ago), datetime.min.time()).replace(hour=hour, minute=minute)


SEED_EMAILS = [
    # ── Exam Notices (pgpexams@) → exam / personal ──────────────────────────
    dict(
        sender_name="PGP Exams", sender_email="pgpexams@iima.ac.in", is_official=True,
        subject="Quiz 2 — Marketing I (Section B)",
        received_at=_recv(0, 8, 42),
        body=f"""Dear Students,

This is to inform you that Quiz 2 for Marketing I will be held on {_d(3)} from 6:30 PM to 7:30 PM.

Venue: CR-2
Syllabus: Sessions 8-14 (STP, Product & Brand decisions).

Please carry your ID cards. No electronic devices are permitted.

Regards,
PGP Exams Office""",
    ),
    dict(
        sender_name="PGP Exams", sender_email="pgpexams@iima.ac.in", is_official=True,
        subject="End-term examination schedule — Term I",
        received_at=_recv(2, 11, 20),
        body=f"""Dear Students,

The end-term examination for Microeconomics is scheduled on {_d(16)} from 9:00 AM to 12:00 PM at CR-1.

Seating arrangement will be displayed outside the exam hall 30 minutes prior.

PGP Exams Office""",
    ),

    # ── Assignments & Quizzes (noreply@ with "Due on") → assignment ─────────
    dict(
        sender_name="IIMA Academics", sender_email="noreply@iima.ac.in", is_official=True,
        subject="Assignment: FRA Problem Set 3 — submission due",
        received_at=_recv(1, 7, 30),
        body=f"""This is an automated notification.

Assignment "FRA Problem Set 3" is Due on {_d(4)} at 11:59 PM.

Submit through the course portal: https://portal.iima.ac.in/courses/fra/assignments/3

Do not reply to this email.""",
    ),

    # ── REM & Doubt Sessions (acads@) → class / personal ────────────────────
    dict(
        sender_name="Academics Office", sender_email="acads@iima.ac.in", is_official=True,
        subject="REM session for Statistics — Section B",
        received_at=_recv(1, 16, 5),
        body=f"""Dear Students,

A REM (Revision & Extra Mile) session for Statistics has been scheduled on {_d(5)} from 8:00 PM to 9:30 PM.

Venue: CR-3

Prof. Iyer will cover hypothesis testing and regression basics. Attendance is optional but recommended.

Academics Office""",
    ),

    # ── Section Admin (pgp@) → admin / personal ─────────────────────────────
    dict(
        sender_name="PGP Office", sender_email="pgp@iima.ac.in", is_official=True,
        subject="[Important] Course registration for Term II closes soon",
        received_at=_recv(2, 10, 0),
        body=f"""Dear Students,

Course registration for Term II electives closes on {_d(6)} at 11:59 PM.

Complete your preferences here: https://forms.gle/iimaTermIIRegistration

Late registrations will not be entertained.

Regards,
PGP Office""",
    ),

    # ── Placement Committee ([PLACECOM]) → placement / personal ─────────────
    dict(
        sender_name="Placement Committee", sender_email="skynet@iima.ac.in", is_official=True,
        subject="[PLACECOM] Pre-placement talk: BCG",
        received_at=_recv(3, 16, 5),
        body=f"""Dear Students,

BCG will be conducting their pre-placement talk on {_d(14)} from 7:30 PM to 8:30 PM at RJM Auditorium.

Attendance is mandatory for students who wish to apply. Formal attire required.
Confirm your attendance: https://forms.gle/bcgPPTattendance

Placement Committee""",
    ),

    # ── Career Clubs (consultclub@, beta@) → workshop / shared ──────────────
    dict(
        sender_name="Consult Club", sender_email="consultclub@iima.ac.in", is_official=True,
        subject="Case prep session — Guesstimates & Market Entry",
        received_at=_recv(0, 11, 5),
        body=f"""Hi everyone,

The Consult Club is conducting a case prep session on Guesstimates and Market Entry frameworks on {_d(5)} at 8:00 PM.

Venue: KLMDC

Seniors who converted MBB offers will run live drills. Register here: https://forms.gle/consultCasePrep

Cheers,
Consult Club""",
    ),
    dict(
        sender_name="Beta — Finance Club", sender_email="beta@iima.ac.in", is_official=True,
        subject="Beta presents: Valuation Masterclass with Kotak IB",
        received_at=_recv(1, 21, 10),
        body=f"""Hello everyone,

Beta is hosting a valuation masterclass with the Kotak Investment Banking team on {_d(9)} from 7:00 PM to 9:00 PM at CT Hall.

Expect a deep dive into DCF, comps, and a live pitch on a listed Indian company.

Sign up: https://forms.gle/betaValuationMasterclass

Regards,
Beta — The Finance & Investments Club""",
    ),

    # ── Seminars & Talks ([Seminar NB], speakerseries@) → talk / shared ─────
    dict(
        sender_name="Speaker Series", sender_email="speakerseries@iima.ac.in", is_official=True,
        subject="[Seminar NB] Research seminar: Behavioural economics of savings",
        received_at=_recv(2, 15, 40),
        body=f"""Dear all,

The Economics area invites you to a research seminar on {_d(8)} at 3:30 PM in the Faculty Block seminar room.

Speaker: Prof. R. Menon (LSE)
Topic: Behavioural economics of household savings in emerging markets

All are welcome.""",
    ),

    # ── Other Clubs (ccc@, sportscomm@, cultcomm@) → club_event / shared ────
    dict(
        sender_name="Agile CCC", sender_email="ccc@iima.ac.in", is_official=True,
        subject="Open house: New campus Wi-Fi & portal upgrades",
        received_at=_recv(1, 17, 30),
        body=f"""Dear all,

Agile CCC is hosting an open house to walk through the new campus Wi-Fi rollout and student portal upgrades, and to collect your feedback.

Date: {_d(7)}
Time: 5:00 PM to 6:00 PM
Venue: RJM Auditorium

Share your issues in advance: https://forms.gle/agileCCCfeedback

— Agile Computer Centre Committee""",
    ),
    dict(
        sender_name="Sports Committee", sender_email="sportscomm@iima.ac.in", is_official=True,
        subject="Inter-section football league — opening match",
        received_at=_recv(2, 19, 45),
        body=f"""Hi all,

The inter-section football league kicks off on {_d(4)} at 6:00 AM at the Sports Complex.

Section A vs Section C. Come cheer for your section — jerseys will be distributed at the ground.

Sports Committee""",
    ),
    dict(
        sender_name="Cultural Committee", sender_email="cultcomm@iima.ac.in", is_official=True,
        subject="Auditions for the annual play",
        received_at=_recv(0, 13, 55),
        body=f"""Hello theatre lovers,

Auditions for this year's annual production are on {_d(2)} at 9:00 PM at Louis Kahn Plaza.

No prior experience needed. Prepare any 2-minute monologue (any language).

Slot booking: https://forms.gle/dramsocAuditions

Break a leg!
Cultural Committee""",
    ),

    # ── Hostel & Facilities (sao@) → admin / shared ─────────────────────────
    dict(
        sender_name="Student Affairs Office", sender_email="sao@iima.ac.in", is_official=True,
        subject="Scheduled power maintenance — Dorm 11 to 15",
        received_at=_recv(4, 9, 30),
        body=f"""Dear residents,

Power supply to Dorms 11-15 will be interrupted on {_d(6)} from 2:00 AM to 5:00 AM for scheduled maintenance.

We apologise for the inconvenience.

Student Affairs Office""",
    ),

    # ── General Notice Board ([Gen NB]) → admin / shared ────────────────────
    dict(
        sender_name="Students' Council", sender_email="generalsecretary@iima.ac.in", is_official=True,
        subject="[Gen NB] Blood donation drive on campus",
        received_at=_recv(3, 12, 15),
        body=f"""Dear all,

A blood donation drive will be held on {_d(11)} from 10:00 AM to 4:00 PM at the Sports Complex.

Register your slot: https://forms.gle/iimaBloodDrive

Students' Council""",
    ),

    # ── Denylist examples — these must NEVER create events ──────────────────
    dict(
        sender_name="The Ken", sender_email="info@the-ken.com", is_official=False,
        subject="The Nutgraf: What India's quick-commerce war really costs",
        received_at=_recv(1, 6, 30),
        body="""Good morning,

Today's edition looks at unit economics in quick commerce, and why the 10-minute promise
may never be profitable. Read it on the app or at https://the-ken.com/story/nutgraf

— The Ken team""",
    ),
    dict(
        sender_name="Coursera", sender_email="no-reply@coursera.org", is_official=False,
        subject="Your certificate is ready",
        received_at=_recv(2, 6, 5),
        body="""Congratulations!

Your certificate for "Financial Markets" is now available for download from your dashboard.

Keep learning,
The Coursera Team""",
    ),
    dict(
        sender_name="Google Forms", sender_email="forms-receipts-noreply@google.com", is_official=False,
        subject="Thanks for filling in Mess Feedback — Week 4",
        received_at=_recv(3, 7, 50),
        body="""Thanks for filling in Mess Feedback — Week 4.

Your response has been recorded. Edit your response: https://docs.google.com/forms/d/e/edit""",
    ),

    # ── Personal peer mail (no filter match → fallback tier) ────────────────
    dict(
        sender_name="Ananya Sharma", sender_email="ananya24@iima.ac.in", is_official=False,
        subject="Case comp team meet — syncing before submission",
        received_at=_recv(0, 15, 40),
        body=f"""Hey Madan,

Let's meet on {_d(2)} at 10:30 PM in the Wing 11 common room to finalise our deck for the Mahindra case competition. The submission deadline is {_d(4)}, so this is our last full sync.

I'll bring the market-sizing sheet, you get the GTM slides?

Ananya""",
    ),
]


def seed_emails(db):
    """Insert seed emails if the table is empty."""
    if db.query(Email).count() > 0:
        return False
    for e in SEED_EMAILS:
        db.add(Email(**e))
    db.commit()
    return True


# Extra emails injected live by the "Simulate incoming mail" demo button.
LIVE_EMAILS = [
    dict(
        sender_name="E-Cell", sender_email="entre@iima.ac.in", is_official=True,
        subject="Founder fireside: 0 to 1 with a Zerodha co-founder",
        body=f"""Hi all,

E-Cell brings you a fireside chat on building from 0 to 1, with a Zerodha co-founder.

Date: {_d(10)}
Time: 8:30 PM
Venue: RJM Auditorium

Doors open at 8:00 PM. Reserve a seat: https://lu.ma/ecell-fireside

E-Cell, IIMA""",
    ),
    dict(
        sender_name="Academics Office", sender_email="acads@iima.ac.in", is_official=True,
        subject="Make-up class: Microeconomics (Section B)",
        body=f"""Dear Students,

A make-up class for Microeconomics has been scheduled on {_d(8)} from 3:00 PM to 4:15 PM.

Venue: CR-1

Attendance rules apply as usual.

Academics Office""",
    ),
    dict(
        sender_name="PGP Exams", sender_email="pgpexams@iima.ac.in", is_official=True,
        subject="Quiz 3 — Financial Reporting & Analysis",
        body=f"""Dear Students,

Quiz 3 for FRA will be held on {_d(12)} from 6.30 pm to 7.30 pm.

Venue: CR-4

Syllabus: Sessions 1-10. Calculators permitted.

PGP Exams Office""",
    ),
    dict(
        sender_name="Media Cell", sender_email="mediacell@iima.ac.in", is_official=True,
        subject="Chaos 2026 — campus fest schedule is out",
        body=f"""Hey everyone,

Chaos 2026 kicks off on {_d(15)} at 5:00 PM at Louis Kahn Plaza.

Three days of music, competitions and food stalls. Full schedule and passes:
https://forms.gle/chaos2026passes

Media Cell""",
    ),
]
