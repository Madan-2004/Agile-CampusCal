"""
Converts the Gmail filter export into the rule set the backend uses.

    python tools/build_rules.py

Reads   backend/rules/gmail_filters_import.xml
Writes  backend/gmail_rules.json

Re-run this whenever you add a sender or tweak a subject pattern in Gmail and
re-export the XML — the website then classifies exactly like your inbox does.
"""
import json
import os
import re
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
XML_PATH = os.path.join(BACKEND, "rules", "gmail_filters_import.xml")
OUT_PATH = os.path.join(BACKEND, "gmail_rules.json")

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "apps": "http://schemas.google.com/apps/2006",
}

# Gmail applies every matching filter; we need exactly ONE label per mail.
# Lower number = evaluated first = wins. Most specific rules must come before
# broad catch-alls. Note "Course Forums" is deliberately last: it is
# `from:noreply@` MINUS the assignment subjects, so the assignment rules
# must get first look.
#
# Subject-tag rules ([Gen NB], [Seminar NB], [PLACECOM]) come FIRST: an explicit
# tag the sender typed is a stronger signal than which mailbox it came from.
# Sender rules follow, most specific first. Broad catch-alls last.
PRIORITY = {
    # explicit subject tags
    "General Notice Board": 1,
    "Placement Committee": 2,
    "Seminars and Talks": 3,
    # system-generated, highly specific
    "Assignments and Quizzes - system": 4,
    "Assignments and Quizzes - Coursera and Turnitin": 5,
    "Exam Notices": 6,
    "REM and Doubt Sessions": 7,
    # office / committee mailboxes
    "Section Admin": 8,
    "SIF": 9,
    "Student Governance": 10,
    "Career Clubs": 11,
    "Other Clubs - part 1": 12,
    "Other Clubs - part 2": 13,
    "Hostel and Facilities": 14,
    "Wellness": 15,
    "Library": 16,
    # denylist sources
    "The Ken": 17,
    "Personal and Govt - Govt and security": 18,
    "Personal and Govt - accounts and systems": 19,
    "Form Receipts": 20,
    # broadest: from:noreply@ MINUS the assignment subjects — must be last
    "Course Forums": 99,
}


def build():
    tree = ET.parse(XML_PATH)
    root = tree.getroot()
    rules = []

    for entry in root.findall("atom:entry", NS):
        title_el = entry.find("atom:title", NS)
        title = title_el.text.strip() if title_el is not None and title_el.text else ""
        query = label = None
        for prop in entry.findall("apps:property", NS):
            if prop.get("name") == "hasTheWord":
                query = prop.get("value")
            elif prop.get("name") == "label":
                label = prop.get("value")
        if not query or not label:
            continue
        rules.append({
            "title": title,
            "label": label,
            "query": query,
            "priority": PRIORITY.get(title, 50),
        })

    rules.sort(key=lambda r: (r["priority"], r["title"]))
    payload = {
        "source": os.path.basename(XML_PATH),
        "count": len(rules),
        "rules": rules,
    }
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(rules)} rules → {OUT_PATH}")
    labels = sorted({r["label"] for r in rules})
    print(f"{len(labels)} distinct labels:")
    for l in labels:
        print("  ", l)


if __name__ == "__main__":
    build()
