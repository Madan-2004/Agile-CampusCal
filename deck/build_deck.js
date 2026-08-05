/**
 * CampusCal - Agile CCC Ideathon deck
 * McKinsey house style per consulting-slide-builder-v2-1 (16:9, 13.333 x 7.5).
 */
const path = require("path");
const PptxGenJS = require("pptxgenjs");
const sizeOf = (p) => {
  const { execSync } = require("child_process");
  const out = execSync(
    `python3 -c "from PIL import Image;im=Image.open('${p}');print(im.size[0],im.size[1])"`
  ).toString().trim().split(" ");
  return { w: +out[0], h: +out[1] };
};

const IMG = path.join(__dirname, "img");
const OUT = path.join(__dirname, "CampusCal_AgileCCC_Ideathon.pptx");

// ---- palette (exact, per skill) ----
const NAVY = "051C2C";
const BLUE = "2251FF";
const CYAN = "00A9F4";
const LBLUE = "AAE6F0";
const G1 = "7F7F7F";
const G2 = "B3B3B3";
const G3 = "D0D0D0";
const WHITE = "FFFFFF";
const SERIF = "Georgia";
const SANS = "Arial";

// ---- geometry ----
const M = 0.56;            // left/right margin
const CW = 12.22;          // content width
const RIGHT = 12.78;       // right edge of content
const TITLE_Y = 0.36;
const RULE_Y = 1.33;
const BODY_Y = 1.6;
const FOOT_RULE_Y = 7.0;
const SRC_Y = 7.06;
const SIDEBAR_X = 9.9;
const EXHIBIT_R = 9.6;     // body ends here on sidebar slides

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE";
pres.author = "Agile CCC Ideathon";
pres.title = "CampusCal";

let page = 0;

/** Standard white content slide: action title, title rule, footer, page no. */
function contentSlide(opts) {
  const s = pres.addSlide();
  page += 1;
  const sidebar = !!opts.sidebar;
  const rightEdge = sidebar ? EXHIBIT_R : RIGHT;
  const width = rightEdge - M;

  s.addText(opts.title, {
    x: M, y: TITLE_Y, w: width, h: 0.86,
    fontFace: SERIF, fontSize: 23, bold: true, color: NAVY,
    align: "left", valign: "top", margin: 0, lineSpacingMultiple: 1.08,
  });
  s.addShape(pres.ShapeType.line, {
    x: M, y: RULE_Y, w: width, h: 0, line: { color: NAVY, width: 0.75 },
  });
  if (opts.kicker) {
    s.addText(opts.kicker, {
      x: M, y: RULE_Y + 0.06, w: 5, h: 0.24,
      fontFace: SANS, fontSize: 9, bold: true, underline: true, color: NAVY, margin: 0,
    });
  }

  // footnotes sit directly above the footer rule
  if (opts.footnotes && opts.footnotes.length) {
    const txt = opts.footnotes.map((f, i) => `${i + 1}. ${f}`).join("\n");
    const h = 0.16 * opts.footnotes.length + 0.06;
    s.addText(txt, {
      x: M, y: FOOT_RULE_Y - h - 0.04, w: width, h,
      fontFace: SANS, fontSize: 8, color: G1, margin: 0, lineSpacingMultiple: 1.05,
    });
  }
  s.addShape(pres.ShapeType.line, {
    x: M, y: FOOT_RULE_Y, w: width, h: 0, line: { color: G3, width: 0.5 },
  });
  if (opts.source) {
    s.addText(opts.source, {
      x: M, y: SRC_Y, w: width - 0.8, h: 0.24,
      fontFace: SANS, fontSize: 8, color: G1, margin: 0,
    });
  }
  s.addText(String(page), {
    x: rightEdge - 0.7, y: SRC_Y, w: 0.7, h: 0.24,
    fontFace: SANS, fontSize: 9, color: G1, align: "right", margin: 0,
  });
  if (opts.notes) s.addNotes(opts.notes);
  return s;
}

/** Dark synthesis sidebar (L14 signature element). */
function addSidebar(s, headline, paras, stats) {
  s.addShape(pres.ShapeType.rect, {
    x: SIDEBAR_X, y: 0, w: 13.333 - SIDEBAR_X, h: 7.5, fill: { color: NAVY }, line: { color: NAVY },
  });
  const x = SIDEBAR_X + 0.42;
  const w = 13.333 - SIDEBAR_X - 0.84;
  s.addShape(pres.ShapeType.line, {
    x, y: 0.9, w: 0.62, h: 0, line: { color: WHITE, width: 1.5 },
  });
  s.addText(headline, {
    x, y: 1.06, w, h: 1.0,
    fontFace: SANS, fontSize: 13.5, bold: true, color: WHITE, margin: 0, lineSpacingMultiple: 1.12,
  });
  let y = 2.16;
  paras.forEach((p) => {
    s.addText(p, {
      x, y, w, h: 0.86,
      fontFace: SANS, fontSize: 10.5, color: "E8EEF2", margin: 0, lineSpacingMultiple: 1.16,
    });
    y += 0.94;
  });
  (stats || []).forEach((st) => {
    s.addText(st.value, {
      x, y, w, h: 0.52,
      fontFace: SERIF, fontSize: 30, bold: true, color: CYAN, margin: 0,
    });
    s.addText(st.label, {
      x, y: y + 0.5, w, h: 0.4,
      fontFace: SANS, fontSize: 9.5, color: "AFC2CE", margin: 0, lineSpacingMultiple: 1.1,
    });
    y += 1.06;
  });
}

/** Image scaled to fit a box. Horizontally centred; vertically centred or top. */
function fitImage(s, file, box) {
  const p = path.join(IMG, file);
  const { w, h } = sizeOf(p);
  const ar = w / h;
  let iw = box.w, ih = box.w / ar;
  if (ih > box.h) { ih = box.h; iw = box.h * ar; }
  const ix = box.x + (box.w - iw) / 2;
  const iy = box.top ? box.y : box.y + (box.h - ih) / 2;
  s.addImage({ path: p, x: ix, y: iy, w: iw, h: ih });
  return { x: ix, y: iy, w: iw, h: ih };
}

/** Thin outline caption under a screenshot. */
function caption(s, text, x, y, w) {
  s.addText(text, {
    x, y, w, h: 0.26,
    fontFace: SANS, fontSize: 9, color: G1, align: "center", margin: 0,
  });
}

/* ==========================================================================
   SLIDE 1 - Title (full-bleed navy)
   ========================================================================== */
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  // thin-line geometric art, right half
  for (let i = 0; i < 14; i++) {
    s.addShape(pres.ShapeType.line, {
      x: 7.6 + i * 0.28, y: 0.4, w: 2.4 - i * 0.06, h: 0,
      line: { color: i % 3 === 0 ? CYAN : BLUE, width: 0.75, transparency: 55 },
      rotate: 62,
    });
  }
  s.addShape(pres.ShapeType.line, {
    x: 8.2, y: 3.75, w: 4.4, h: 0, line: { color: CYAN, width: 1 },
  });
  s.addText("CampusCal", {
    x: 0.9, y: 2.22, w: 7.2, h: 0.95,
    fontFace: SERIF, fontSize: 46, bold: true, color: WHITE, margin: 0,
  });
  s.addText("Turning the campus inbox into a calendar that fills itself", {
    x: 0.9, y: 3.18, w: 7.0, h: 1.1,
    fontFace: SERIF, fontSize: 21, color: LBLUE, margin: 0, lineSpacingMultiple: 1.15,
  });
  s.addShape(pres.ShapeType.line, {
    x: 0.92, y: 4.42, w: 1.5, h: 0, line: { color: CYAN, width: 1.5 },
  });
  s.addText("Agile CCC Ideathon  |  Solutions Cell submission", {
    x: 0.9, y: 4.62, w: 7, h: 0.3,
    fontFace: SANS, fontSize: 12, color: WHITE, margin: 0,
  });
  s.addText("Working prototype running on live IIMA Gmail  |  August 2026", {
    x: 0.9, y: 4.96, w: 7, h: 0.3,
    fontFace: SANS, fontSize: 11, color: "AFC2CE", margin: 0,
  });
  s.addText("Prepared for the Agile CCC Ideathon. Screenshots are from the live prototype and show a real student inbox.", {
    x: 0.9, y: 6.72, w: 8.4, h: 0.3,
    fontFace: SANS, fontSize: 7.5, color: "6E8794", margin: 0,
  });
  s.addNotes("Open with the governing thought: campus information is not missing, it is scattered across email. CampusCal makes the inbox fill the calendar. It already runs on live IIMA mail.");
}

/* ==========================================================================
   SLIDE 2 - L1 Executive summary
   ========================================================================== */
{
  const s = contentSlide({
    title: "CampusCal converts campus email into a calendar that fills itself, and it already runs on live IIMA mail",
    source: "Source: CampusCal prototype instrumentation, live Gmail account, 5 August 2026",
    notes: "The bold sentences alone are the argument. Land the 133 events and the 89% to 23% improvement.",
  });

  const paras = [
    {
      b: "The problem is discovery, not information.",
      t: " Quizzes, deadlines, club events and placement notices all arrive by email. In one live student inbox, 14 mails landed in the four hours before capture, and the 100 most recent inbox mails span barely a week. Anything not read on the day is effectively lost.",
    },
    {
      b: "Every calendar tool assumes somebody types the event in. Nobody does.",
      t: " The gap is not tooling, it is manual entry. Students already own Google Calendar, they simply never populate it from 100 mails.",
    },
    {
      b: "CampusCal reads the inbox and writes the calendar, in two layers.",
      t: " A shared campus layer captures what everyone may attend; a personal layer captures what is addressed to the individual student, such as quizzes, assignments and placement notices.",
    },
    {
      b: "Segmentation is deterministic, tiered and auditable.",
      t: " 21 imported Gmail filter rules, 112 sender patterns, 9 generic sender rules and 237 weighted keywords route each mail onto one of 18 source labels and one of 9 calendar categories, with a keyword fallback that prefers Other over a wrong guess.",
    },
    {
      b: "The prototype is complete end to end and measured.",
      t: " 133 events are live on the calendar today. Unclassified events fell from 89% to 23% after the segmentation rework, and 126 automated checks pass on every build.",
    },
  ];
  let y = BODY_Y + 0.05;
  paras.forEach((p) => {
    s.addText(
      [
        { text: p.b, options: { bold: true, color: NAVY } },
        { text: p.t, options: { color: "333333" } },
      ],
      {
        x: M, y, w: 11.4, h: 0.92,
        fontFace: SANS, fontSize: 11.5, margin: 0, lineSpacingMultiple: 1.22,
      }
    );
    y += 1.02;
  });
}

/* ==========================================================================
   SLIDE 3 - L14 Problem + dark sidebar
   ========================================================================== */
{
  const s = contentSlide({
    title: "The information is not missing, it is scattered: 14 mails reached one student inbox in four hours",
    kicker: "Live student inbox, not a mock-up",
    sidebar: true,
    footnotes: [
      "Timestamps read from the live inbox capture: 14 mails between 4:59 pm and 9:23 pm on 5 August 2026",
      "Only mails carrying a date, time or venue can become calendar entries; the rest are notices or newsletters",
    ],
    source: "Source: CampusCal inbox view, live IIMA Gmail account, 5 August 2026",
    notes: "Point at the timestamps down the right edge. Four and a half hours, 14 mails, four of them carrying a hard commitment.",
  });

  s.addText("What arrives in a single evening", {
    x: M, y: BODY_Y, w: 4.4, h: 0.3,
    fontFace: SANS, fontSize: 12, bold: true, color: NAVY, margin: 0,
  });
  s.addText("Inbox as captured, most recent first¹", {
    x: M, y: BODY_Y + 0.28, w: 4.4, h: 0.26,
    fontFace: SANS, fontSize: 9.5, color: G1, margin: 0,
  });
  fitImage(s, "s212850.png", { x: M, y: BODY_Y + 0.62, w: 2.6, h: 3.86, top: true });

  // annotation column
  const ax = 3.55, aw = 5.9;
  s.addText("Four of these 14 mails carried a dated commitment", {
    x: ax, y: BODY_Y + 0.62, w: aw, h: 0.32,
    fontFace: SANS, fontSize: 12, bold: true, color: NAVY, margin: 0,
  });
  const rows = [
    ["9:23 pm", "Ideathon case competition", "Club event, registration link"],
    ["8:15 pm", "Essay writing competition", "Club event, results announced next day"],
    ["8:00 pm", "Dorm representative elections", "Notice, voting window"],
    ["5:00 pm", "PLACECOM batch meet, 10 August", "Placement, dated and compulsory"],
  ];
  let ry = BODY_Y + 1.06;
  s.addShape(pres.ShapeType.line, { x: ax, y: ry - 0.06, w: aw, h: 0, line: { color: NAVY, width: 0.75 } });
  rows.forEach((r) => {
    s.addText(r[0], { x: ax, y: ry + 0.06, w: 0.95, h: 0.3, fontFace: SANS, fontSize: 10, color: G1, margin: 0 });
    s.addText(r[1], { x: ax + 0.98, y: ry + 0.06, w: 2.72, h: 0.3, fontFace: SANS, fontSize: 10.5, bold: true, color: NAVY, margin: 0 });
    s.addText(r[2], { x: ax + 3.74, y: ry + 0.06, w: 2.16, h: 0.34, fontFace: SANS, fontSize: 9.5, color: "444444", margin: 0, lineSpacingMultiple: 1.05 });
    ry += 0.52;
    s.addShape(pres.ShapeType.line, { x: ax, y: ry, w: aw, h: 0, line: { color: G3, width: 0.5 } });
  });

  s.addText("The remaining 10 mails were notices, surveys and newsletters that must not reach a calendar²", {
    x: ax, y: ry + 0.18, w: aw, h: 0.4,
    fontFace: SANS, fontSize: 10, color: G1, margin: 0, lineSpacingMultiple: 1.15,
  });

  // three stat blocks
  const stats = [["14", "mails in 4h 24m"], ["100", "mails on the first inbox page"], ["7", "unread at capture"]];
  let sx = ax;
  stats.forEach((st) => {
    s.addText(st[0], { x: sx, y: ry + 0.76, w: 1.9, h: 0.62, fontFace: SERIF, fontSize: 30, bold: true, color: BLUE, margin: 0 });
    s.addText(st[1], { x: sx, y: ry + 1.36, w: 1.9, h: 0.42, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0, lineSpacingMultiple: 1.1 });
    sx += 2.0;
  });

  addSidebar(
    s,
    "Students find out second hand, because reading everything on the day is the only way not to",
    [
      "Mail volume is steady and unfiltered. A quiz notice and a food delivery receipt arrive in the same stream, with the same weight.",
      "The details are all there: date, time, venue, registration link. They simply never reach a calendar, because that step is manual.",
    ],
    [{ value: "3 per hour", label: "Average inbound rate over the captured window" }]
  );
}

/* ==========================================================================
   SLIDE 4 - L2 contrast: intended vs actual behaviour
   ========================================================================== */
{
  const s = contentSlide({
    title: "Every existing tool assumes a student types the event in, which is exactly the step that never happens",
    kicker: "Illustrative, not exhaustive",
    source: "Source: CampusCal problem definition, Agile CCC application response, July 2026",
    notes: "This is the complication slide. The gap is not tooling, it is the manual step in the middle.",
  });

  s.addText("What the current process assumes", {
    x: M, y: BODY_Y, w: 5.5, h: 0.32,
    fontFace: SANS, fontSize: 12.5, bold: true, color: G1, margin: 0,
  });
  s.addText("What actually happens", {
    x: 6.9, y: BODY_Y, w: 5.5, h: 0.32,
    fontFace: SANS, fontSize: 12.5, bold: true, color: NAVY, margin: 0,
  });
  s.addShape(pres.ShapeType.line, { x: M, y: BODY_Y + 0.34, w: 5.5, h: 0, line: { color: G3, width: 0.75 } });
  s.addShape(pres.ShapeType.line, { x: 6.9, y: BODY_Y + 0.34, w: 5.5, h: 0, line: { color: NAVY, width: 0.75 } });

  const pairs = [
    ["The student reads every mail on the day it arrives",
     "14 mails an evening; most are skimmed, many are never opened"],
    ["The student copies date, time and venue into a calendar",
     "Manual entry is the single step nobody performs, for any mail"],
    ["Clubs and offices publish to a shared campus calendar",
     "No shared calendar exists; each club broadcasts by email only"],
    ["Registration links are saved when the mail is read",
     "Links are buried in threads and re-found by searching the inbox"],
    ["Missing an event is an individual lapse",
     "Whole sections learn about deadlines second hand, from peers"],
  ];
  let y = BODY_Y + 0.52;
  pairs.forEach((p, i) => {
    s.addShape(pres.ShapeType.ellipse, {
      x: M, y: y + 0.11, w: 0.26, h: 0.26, fill: { color: NAVY }, line: { color: NAVY },
    });
    s.addText(String(i + 1), {
      x: M, y: y + 0.11, w: 0.26, h: 0.26,
      fontFace: SANS, fontSize: 9, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0,
    });
    s.addText(p[0], {
      x: M + 0.4, y: y + 0.06, w: 5.05, h: 0.5,
      fontFace: SANS, fontSize: 11, color: G1, margin: 0, lineSpacingMultiple: 1.12,
    });
    s.addText(p[1], {
      x: 6.9, y: y + 0.06, w: 5.5, h: 0.5,
      fontFace: SANS, fontSize: 11, color: NAVY, bold: true, margin: 0, lineSpacingMultiple: 1.12,
    });
    y += 0.78;
    s.addShape(pres.ShapeType.line, { x: M, y, w: 11.84, h: 0, line: { color: G3, width: 0.5 } });
  });

  s.addText(
    [
      { text: "The implication: ", options: { bold: true, color: NAVY } },
      { text: "automate the entry step and the rest of the problem disappears, because the data already exists in the mail", options: { color: "333333" } },
    ],
    { x: M, y: y + 0.22, w: 11.84, h: 0.4, fontFace: SANS, fontSize: 11.5, margin: 0 }
  );
}

/* ==========================================================================
   SLIDE 5 - L11 chevron pipeline
   ========================================================================== */
{
  const s = contentSlide({
    title: "CampusCal removes that step: it ingests, classifies, extracts and publishes, with no manual entry at any point",
    source: "Source: CampusCal architecture, backend/parser.py and backend/main.py",
    notes: "Four stages. Emphasise that the same pipeline runs on login, on Load more, and every 45 seconds while open.",
  });

  const steps = [
    ["A. Ingest", ["Gmail API, read only", "100 mails per page, 12 parallel fetches", "Polls every 45 seconds while open"]],
    ["B. Classify", ["4 tiers, most certain first", "18 source labels, 9 categories", "Denylist blocks newsletters and receipts"]],
    ["C. Extract", ["Date, time, venue, links", "Quoted reply text stripped first", "Confidence score on every draft"]],
    ["D. Publish", ["Campus layer or personal layer", "One click push to Google Calendar", "Idempotent and fully reversible"]],
  ];
  const cw = 2.86, gap = 0.16;
  let x = M;
  steps.forEach((st) => {
    s.addShape(pres.ShapeType.chevron, {
      x, y: BODY_Y + 0.1, w: cw, h: 0.78,
      fill: { color: NAVY }, line: { color: NAVY },
    });
    s.addText(st[0], {
      x: x + 0.46, y: BODY_Y + 0.1, w: cw - 0.7, h: 0.78,
      fontFace: SANS, fontSize: 13, bold: true, color: WHITE, valign: "middle", margin: 0,
    });
    let by = BODY_Y + 1.12;
    st[1].forEach((b) => {
      s.addShape(pres.ShapeType.line, { x, y: by - 0.06, w: cw - 0.2, h: 0, line: { color: G3, width: 0.5 } });
      s.addText(b, {
        x, y: by, w: cw - 0.24, h: 0.56,
        fontFace: SANS, fontSize: 10.5, color: "333333", margin: 0, lineSpacingMultiple: 1.14,
      });
      by += 0.66;
    });
    x += cw + gap;
  });

  // continuous workstream bar
  s.addShape(pres.ShapeType.rect, {
    x: M, y: 4.66, w: 11.84, h: 0.62,
    fill: { color: "F2F5F7" }, line: { color: G3, width: 0.5 },
  });
  s.addText(
    [
      { text: "Student stays in control throughout:  ", options: { bold: true, color: NAVY } },
      { text: "every auto-added event links back to its source mail, every draft is editable before saving, and every push to Google Calendar can be undone in one click", options: { color: "333333" } },
    ],
    { x: M + 0.2, y: 4.66, w: 11.44, h: 0.62, fontFace: SANS, fontSize: 10.5, valign: "middle", margin: 0 }
  );

  s.addText("Ingestion and classification run on sign-in, on each Load more, and on a 45 second poll while the app is open", {
    x: M, y: 5.4, w: 11.84, h: 0.3,
    fontFace: SANS, fontSize: 10, color: G1, margin: 0,
  });

  s.addText(
    [
      { text: "No manual entry means no adoption barrier:  ", options: { bold: true, color: NAVY } },
      { text: "a student signs in once and the calendar is already populated, which is the difference between a tool that is tried and a tool that is used", options: { color: "333333" } },
    ],
    { x: M, y: 5.86, w: 11.84, h: 0.42, fontFace: SANS, fontSize: 10.5, margin: 0, lineSpacingMultiple: 1.12 }
  );
}

/* ==========================================================================
   SLIDE 6 - L2 two layers
   ========================================================================== */
{
  const s = contentSlide({
    title: "Two layers separate what the whole campus may attend from what is addressed to the individual student",
    source: "Source: CampusCal label routing table, backend/categories.py",
    notes: "The two-layer design comes straight from the original Agile CCC application answer. Routing is by source label, then overridden by personal-intent phrases.",
  });

  const cols = [
    {
      x: M, w: 5.72, head: "Campus calendar, shared layer", tint: CYAN,
      sub: "Broadcasts anyone on campus may attend",
      rows: [
        ["Seminars & Talks", "Research seminars, speaker series"],
        ["Career Clubs", "Case prep, masterclasses, competitions"],
        ["Other Clubs", "Fests, sports, cultural, dramatics"],
        ["General Notice Board", "Tagged [Gen NB] announcements"],
        ["Student Governance", "Council notices, elections"],
        ["Hostel & Facilities", "Maintenance and dorm notices"],
      ],
    },
    {
      x: 6.9, w: 5.5, head: "My calendar, personal layer", tint: BLUE,
      sub: "Mail addressed to this student specifically",
      rows: [
        ["Exam Notices", "Quizzes, mid-terms, end-terms"],
        ["Assignments & Quizzes", "Submissions, Turnitin, due dates"],
        ["REM & Doubt Sessions", "Make-up classes, revision sessions"],
        ["Section Admin", "Registration windows, section notices"],
        ["Placement Committee", "PPTs, CV verification, interview slots"],
        ["Course Forums", "Course announcements and material"],
      ],
    },
  ];

  cols.forEach((c) => {
    s.addShape(pres.ShapeType.rect, { x: c.x, y: BODY_Y, w: 0.14, h: 0.3, fill: { color: c.tint }, line: { color: c.tint } });
    s.addText(c.head, {
      x: c.x + 0.26, y: BODY_Y - 0.02, w: c.w - 0.26, h: 0.34,
      fontFace: SANS, fontSize: 12.5, bold: true, color: NAVY, margin: 0,
    });
    s.addText(c.sub, {
      x: c.x, y: BODY_Y + 0.32, w: c.w, h: 0.28,
      fontFace: SANS, fontSize: 9.5, color: G1, margin: 0,
    });
    let y = BODY_Y + 0.66;
    s.addShape(pres.ShapeType.line, { x: c.x, y, w: c.w, h: 0, line: { color: NAVY, width: 0.75 } });
    c.rows.forEach((r) => {
      s.addText(r[0], { x: c.x, y: y + 0.08, w: 2.35, h: 0.34, fontFace: SANS, fontSize: 10.5, bold: true, color: NAVY, margin: 0 });
      s.addText(r[1], { x: c.x + 2.4, y: y + 0.08, w: c.w - 2.4, h: 0.34, fontFace: SANS, fontSize: 10, color: "444444", margin: 0 });
      y += 0.5;
      s.addShape(pres.ShapeType.line, { x: c.x, y, w: c.w, h: 0, line: { color: G3, width: 0.5 } });
    });
  });

  const notes = [
    ["Routing rule", "The source label decides the layer, so a mail from the exams office is personal and a mail from a club is campus wide"],
    ["Override", "Personal intent phrases such as shortlisted, your interview or roll number move a broadcast onto the personal layer"],
    ["Denylist", "4 of the 18 labels never create events at all: The Ken, Form Receipts, Library and Personal & Govt"],
  ];
  let ny = 5.46;
  notes.forEach((n) => {
    s.addText(
      [
        { text: n[0] + ":  ", options: { bold: true, color: NAVY } },
        { text: n[1], options: { color: "333333" } },
      ],
      { x: M, y: ny, w: 11.84, h: 0.36, fontFace: SANS, fontSize: 10.5, margin: 0, lineSpacingMultiple: 1.1 }
    );
    ny += 0.42;
  });
}

/* ==========================================================================
   SLIDE 7 - L5 feature table + stat rail
   ========================================================================== */
{
  const s = contentSlide({
    title: "Six capabilities are live in the prototype, each measurable on real inbox data",
    source: "Source: CampusCal codebase, 5,978 lines across backend and frontend; test_classification.py, 5 August 2026",
    notes: "Run down the six. The stat rail on the right is the proof column.",
  });

  s.addText("Capability", { x: M, y: BODY_Y, w: 2.5, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0 });
  s.addText("What it does", { x: M + 2.6, y: BODY_Y, w: 4.0, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0 });
  s.addText("Evidence in the running build", { x: M + 6.7, y: BODY_Y, w: 2.5, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0 });
  s.addShape(pres.ShapeType.line, { x: M, y: BODY_Y + 0.3, w: 9.2, h: 0, line: { color: NAVY, width: 0.75 } });

  const feats = [
    ["A. Gmail ingestion", "Reads the inbox over the Gmail API, read only, with paging and a live poll", "100 mails per page, 12 parallel fetches, 45 second poll"],
    ["B. Segmentation", "Routes every mail onto one source label and one calendar category", "18 labels, 9 categories, 4 tiers"],
    ["C. Event extraction", "Pulls title, date, time, venue and links from the mail body", "237 weighted keywords, 5 date formats"],
    ["D. Registration links", "Detects and attaches the registration or meeting URL to the event", "4 link classes, tracking links dropped"],
    ["E. Google Calendar sync", "Reads existing calendars and pushes CampusCal events back, reversibly", "118 events read, idempotent push"],
    ["F. Responsive interface", "One codebase across desktop, tablet and mobile, with dark mode", "3 breakpoints, light and dark themes"],
  ];
  let y = BODY_Y + 0.42;
  feats.forEach((f) => {
    s.addText(f[0], { x: M, y, w: 2.5, h: 0.5, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(f[1], { x: M + 2.6, y, w: 4.0, h: 0.5, fontFace: SANS, fontSize: 10.5, color: "333333", margin: 0, valign: "middle", lineSpacingMultiple: 1.1 });
    s.addText(f[2], { x: M + 6.7, y, w: 2.5, h: 0.5, fontFace: SANS, fontSize: 10, color: G1, margin: 0, valign: "middle", lineSpacingMultiple: 1.1 });
    y += 0.66;
    s.addShape(pres.ShapeType.line, { x: M, y, w: 9.2, h: 0, line: { color: G3, width: 0.5 } });
  });

  // stat rail
  const rail = [
    ["133", "events live on the calendar today"],
    ["126", "automated checks, all passing"],
    ["~6,000", "lines of application code"],
  ];
  let sy = BODY_Y + 0.42;
  rail.forEach((r) => {
    s.addText(r[0], { x: 10.1, y: sy, w: 2.68, h: 0.66, fontFace: SERIF, fontSize: 34, bold: true, color: BLUE, margin: 0 });
    s.addText(r[1], { x: 10.1, y: sy + 0.66, w: 2.68, h: 0.5, fontFace: SANS, fontSize: 10, color: G1, margin: 0, lineSpacingMultiple: 1.12 });
    sy += 1.36;
  });
  s.addShape(pres.ShapeType.line, { x: 9.86, y: BODY_Y + 0.36, w: 0, h: 4.1, line: { color: G3, width: 0.5 } });
}

/* ==========================================================================
   SLIDE 8 - L14 segmentation logic, two axes (REQUIRED deep dive, part 1)
   ========================================================================== */
{
  const s = contentSlide({
    title: "Segmentation runs on two axes: who sent the mail, and what kind of event it is",
    kicker: "Segmentation logic, part 1 of 2",
    sidebar: true,
    footnotes: [
      "Source labels are imported from the student's own Gmail filter set (gmail_filters_import.xml), so the website and the inbox agree",
      "Nine categories were chosen deliberately: 18 colours on a month grid is unreadable, so provenance is carried by the label instead",
    ],
    source: "Source: backend/categories.py; gmail_filters_import.xml, 21 rules covering 18 labels",
    notes: "This is the slide the panel will probe. Explain why two axes: colour must stay readable, provenance must stay auditable.",
  });

  // Axis 1
  s.addText("Axis 1: source label, who sent it¹", {
    x: M, y: BODY_Y, w: 4.3, h: 0.3, fontFace: SANS, fontSize: 12, bold: true, color: NAVY, margin: 0,
  });
  s.addText("18 labels, mirrored from the student's Gmail filters", {
    x: M, y: BODY_Y + 0.28, w: 4.3, h: 0.26, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0,
  });
  const labels = [
    "Exam Notices", "Assignments & Quizzes", "Placement Committee",
    "Career Clubs", "Other Clubs", "Seminars & Talks",
    "Section Admin", "REM & Doubt Sessions", "Course Forums",
    "General Notice Board", "Student Governance", "SIF",
    "Hostel & Facilities", "Wellness", "Library",
    "The Ken", "Form Receipts", "Personal & Govt",
  ];
  let lx = M, ly = BODY_Y + 0.64;
  labels.forEach((l, i) => {
    const denied = i >= 15;
    s.addText(l, {
      x: lx, y: ly, w: 1.38, h: 0.34,
      fontFace: SANS, fontSize: 8.5, color: denied ? G2 : NAVY, margin: 0,
      valign: "middle", lineSpacingMultiple: 1.0,
    });
    s.addShape(pres.ShapeType.line, { x: lx, y: ly + 0.34, w: 1.34, h: 0, line: { color: G3, width: 0.5 } });
    lx += 1.44;
    if ((i + 1) % 3 === 0) { lx = M; ly += 0.42; }
  });
  s.addText("Greyed labels are denylisted: newsletters, receipts and account mail never create an event", {
    x: M, y: ly + 0.06, w: 4.4, h: 0.42, fontFace: SANS, fontSize: 9, color: G1, margin: 0, lineSpacingMultiple: 1.12,
  });

  // Axis 2
  const bx = 5.3;
  s.addText("Axis 2: category, what kind of thing it is²", {
    x: bx, y: BODY_Y, w: 4.2, h: 0.3, fontFace: SANS, fontSize: 12, bold: true, color: NAVY, margin: 0,
  });
  s.addText("9 categories, these are what colour the calendar", {
    x: bx, y: BODY_Y + 0.28, w: 4.2, h: 0.26, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0,
  });
  const cats = [
    ["Exams & quizzes", "E5484D", "Quizzes, mid-terms, end-terms"],
    ["Assignments", "F97316", "Submissions and due dates"],
    ["Classes", "3B82F6", "Lectures, REM, make-up classes"],
    ["Placement", "6366F1", "PPTs, CV rounds, interviews"],
    ["Workshops", "10B981", "Case prep, training, masterclass"],
    ["Talks & seminars", "14B8A6", "Speaker series, panels"],
    ["Club events", "A855F7", "Fests, competitions, auditions"],
    ["Notices & admin", "D97706", "Facilities, elections, circulars"],
    ["Other", "8B8D98", "Deliberately unclassified"],
  ];
  let cy = BODY_Y + 0.64;
  s.addShape(pres.ShapeType.line, { x: bx, y: cy - 0.06, w: 4.2, h: 0, line: { color: NAVY, width: 0.75 } });
  cats.forEach((c) => {
    s.addShape(pres.ShapeType.rect, { x: bx, y: cy + 0.11, w: 0.16, h: 0.16, fill: { color: c[1] }, line: { color: c[1] } });
    s.addText(c[0], { x: bx + 0.28, y: cy + 0.02, w: 1.66, h: 0.34, fontFace: SANS, fontSize: 10, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(c[2], { x: bx + 1.98, y: cy + 0.02, w: 2.22, h: 0.34, fontFace: SANS, fontSize: 9.5, color: "444444", margin: 0, valign: "middle" });
    cy += 0.44;
    s.addShape(pres.ShapeType.line, { x: bx, y: cy, w: 4.2, h: 0, line: { color: G3, width: 0.5 } });
  });

  addSidebar(
    s,
    "Splitting the axes is what makes the calendar readable and the classification auditable",
    [
      "The label answers where an event came from and stays attached to it, so any student can verify a parse against the original mail.",
      "The category answers what it is and drives colour, filtering and layer routing. Nine colours read cleanly on a month grid; eighteen do not.",
    ],
    [{ value: "18 x 9", label: "Label and category combinations, from one classification pass" }]
  );
}

/* ==========================================================================
   SLIDE 9 - segmentation, four tiers (REQUIRED deep dive, part 2)
   ========================================================================== */
{
  const s = contentSlide({
    title: "Classification resolves in four tiers, cheapest and most certain first, and prefers Other over a confident wrong guess",
    kicker: "Segmentation logic, part 2 of 2",
    footnotes: [
      "Tier 2 evaluates the same query grammar Gmail uses: from, to, cc, subject, negation, OR and parentheses",
      "Tier ordering is explicit: subject tags such as [Gen NB] and [PLACECOM] outrank sender rules, and the broad noreply catch-all is evaluated last",
    ],
    source: "Source: backend/rules_engine.py and backend/parser.py; rule set generated from gmail_filters_import.xml",
    notes: "Walk the four tiers. The key defensive point: the fallback refuses to guess, which is why Other still exists at 23%.",
  });

  const tiers = [
    ["Tier 1", "Gmail label already applied", "Reads the IIMA label the student's own Gmail filters attached to the thread", "Authoritative, zero logic, free", CYAN],
    ["Tier 2", "Imported filter rules¹", "Re-evaluates the same 21 rules inside the app, for accounts that never imported the filters", "112 sender and recipient patterns", BLUE],
    ["Tier 3", "Generic sender rules", "Covers the non-IIMA world: LinkedIn, Unstop, Coursera, Meetup, banks, delivery and newsletters", "9 rules, 5 of them event creating", NAVY],
    ["Tier 4", "Weighted keyword scoring", "Subject hits count three times body hits; the highest scoring category wins", "237 keywords across 8 categories", G1],
  ];

  s.addText("Tier", { x: M, y: BODY_Y, w: 0.9, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0 });
  s.addText("Signal used", { x: M + 0.95, y: BODY_Y, w: 2.5, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0 });
  s.addText("How it decides", { x: M + 3.5, y: BODY_Y, w: 5.4, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0 });
  s.addText("Scale in the build", { x: M + 9.0, y: BODY_Y, w: 2.85, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0 });
  s.addShape(pres.ShapeType.line, { x: M, y: BODY_Y + 0.3, w: 11.84, h: 0, line: { color: NAVY, width: 0.75 } });

  let y = BODY_Y + 0.44;
  tiers.forEach((t) => {
    s.addShape(pres.ShapeType.rect, { x: M, y: y + 0.06, w: 0.1, h: 0.5, fill: { color: t[4] }, line: { color: t[4] } });
    s.addText(t[0], { x: M + 0.2, y, w: 0.75, h: 0.62, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(t[1], { x: M + 0.95, y, w: 2.5, h: 0.62, fontFace: SANS, fontSize: 10.5, bold: true, color: NAVY, margin: 0, valign: "middle", lineSpacingMultiple: 1.1 });
    s.addText(t[2], { x: M + 3.5, y, w: 5.4, h: 0.62, fontFace: SANS, fontSize: 10.5, color: "333333", margin: 0, valign: "middle", lineSpacingMultiple: 1.1 });
    s.addText(t[3], { x: M + 9.0, y, w: 2.85, h: 0.62, fontFace: SANS, fontSize: 10, color: G1, margin: 0, valign: "middle", lineSpacingMultiple: 1.1 });
    y += 0.74;
    s.addShape(pres.ShapeType.line, { x: M, y, w: 11.84, h: 0, line: { color: G3, width: 0.5 } });
  });

  // worked example
  s.addText("Worked example, one real inbox mail", {
    x: M, y: y + 0.22, w: 5.6, h: 0.3, fontFace: SANS, fontSize: 11.5, bold: true, color: NAVY, margin: 0,
  });
  s.addText(
    [
      { text: "Subject:  ", options: { bold: true, color: NAVY } },
      { text: "Re: [COMPETITION] Brand Baazigar 2026, Brand Analysis", options: { color: "333333" } },
      { text: "\nSender:  ", options: { bold: true, color: NAVY } },
      { text: "niche@iima.ac.in", options: { color: "333333" } },
    ],
    { x: M, y: y + 0.54, w: 5.6, h: 0.66, fontFace: SANS, fontSize: 10.5, margin: 0, lineSpacingMultiple: 1.2 }
  );
  const chain = [
    ["Tier 2 matches", "Sender is in the Career Clubs rule, so the label is Career Clubs"],
    ["Base category", "Career Clubs maps to Workshops by default"],
    ["Content override", "COMPETITION scores higher within the activity set, so the category becomes Club events"],
    ["Layer", "Career Clubs is a broadcast label, so the event lands on the campus calendar"],
  ];
  let cyy = y + 0.2;
  chain.forEach((c, i) => {
    s.addShape(pres.ShapeType.ellipse, { x: 6.5, y: cyy + 0.04, w: 0.22, h: 0.22, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(String(i + 1), { x: 6.5, y: cyy + 0.04, w: 0.22, h: 0.22, fontFace: SANS, fontSize: 8, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(
      [
        { text: c[0] + ":  ", options: { bold: true, color: NAVY } },
        { text: c[1], options: { color: "333333" } },
      ],
      { x: 6.84, y: cyy, w: 5.54, h: 0.34, fontFace: SANS, fontSize: 10, margin: 0, lineSpacingMultiple: 1.08 }
    );
    cyy += 0.34;
  });
}

/* ==========================================================================
   SLIDE 10 - extraction and the surety gate
   ========================================================================== */
{
  const s = contentSlide({
    title: "Extraction pulls five fields from the mail body, and a surety gate blocks anything the parser cannot prove",
    footnotes: [
      "Quoted reply text is removed before parsing, so a date inside an older message in the thread cannot create a phantom event",
      "Vague dates such as tomorrow or this Friday are accepted only when the mail also pins a time or a venue",
    ],
    source: "Source: backend/parser.py, backend/links.py; gate logic in backend/main.py, gmail_sync",
    notes: "Precision story. The gate is why the calendar is trustworthy; the fallback to manual add is why nothing is lost.",
  });

  // left: extracted fields
  s.addText("What is extracted from each mail", {
    x: M, y: BODY_Y, w: 5.4, h: 0.3, fontFace: SANS, fontSize: 12, bold: true, color: NAVY, margin: 0,
  });
  const fields = [
    ["Title", "Subject line, cleaned of Re, Fwd and Reminder prefixes"],
    ["Date", "Five formats: 18 July, 18/07/2026, 18.07.2026, tomorrow, this Friday"],
    ["Time", "6:30 PM, 6.30 pm, 1730 hrs, 17:00, noon, and ranges"],
    ["Venue", "Campus gazetteer: RJM Auditorium, KLMDC, CR-1 to CR-4, LKP"],
    ["Links", "Registration, meeting, resource; tracking links dropped"],
  ];
  let y = BODY_Y + 0.4;
  s.addShape(pres.ShapeType.line, { x: M, y: y - 0.06, w: 5.4, h: 0, line: { color: NAVY, width: 0.75 } });
  fields.forEach((f) => {
    s.addText(f[0], { x: M, y: y + 0.04, w: 1.0, h: 0.46, fontFace: SANS, fontSize: 10.5, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(f[1], { x: M + 1.05, y: y + 0.04, w: 4.35, h: 0.46, fontFace: SANS, fontSize: 10, color: "333333", margin: 0, valign: "middle", lineSpacingMultiple: 1.1 });
    y += 0.56;
    s.addShape(pres.ShapeType.line, { x: M, y, w: 5.4, h: 0, line: { color: G3, width: 0.5 } });
  });

  s.addText("Every draft also carries a confidence score, shown to the student as a percentage before the event is saved", {
    x: M, y: y + 0.16, w: 5.4, h: 0.44, fontFace: SANS, fontSize: 10, color: G1, margin: 0, lineSpacingMultiple: 1.14,
  });

  // right: the gate as a funnel
  const gx = 6.6;
  s.addText("The surety gate, applied before any automatic add", {
    x: gx, y: BODY_Y, w: 5.8, h: 0.3, fontFace: SANS, fontSize: 12, bold: true, color: NAVY, margin: 0,
  });
  const gates = [
    ["Allowed source", "Denylisted labels are dropped outright", "4 labels blocked"],
    ["A parseable date", "No date, no event", "quoted text stripped¹"],
    ["A corroborating signal", "A time, a venue, or event language", "237 keywords"],
    ["Date certainty", "Vague dates need a time or venue²", "explicit dates preferred"],
    ["Not in the past", "Past dated mail is never added", "date compared to today"],
    ["Not a duplicate", "Same title and date is skipped", "plus Gmail message id"],
  ];
  let gy = BODY_Y + 0.4;
  s.addShape(pres.ShapeType.line, { x: gx, y: gy - 0.06, w: 5.8, h: 0, line: { color: NAVY, width: 0.75 } });
  gates.forEach((g, i) => {
    s.addShape(pres.ShapeType.ellipse, { x: gx, y: gy + 0.12, w: 0.24, h: 0.24, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(String(i + 1), { x: gx, y: gy + 0.12, w: 0.24, h: 0.24, fontFace: SANS, fontSize: 8.5, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(g[0], { x: gx + 0.36, y: gy + 0.04, w: 1.85, h: 0.44, fontFace: SANS, fontSize: 10.5, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(g[1], { x: gx + 2.24, y: gy + 0.04, w: 2.35, h: 0.44, fontFace: SANS, fontSize: 10, color: "333333", margin: 0, valign: "middle", lineSpacingMultiple: 1.08 });
    s.addText(g[2], { x: gx + 4.62, y: gy + 0.04, w: 1.18, h: 0.44, fontFace: SANS, fontSize: 9, color: G1, margin: 0, valign: "middle", lineSpacingMultiple: 1.08 });
    gy += 0.56;
    s.addShape(pres.ShapeType.line, { x: gx, y: gy, w: 5.8, h: 0, line: { color: G3, width: 0.5 } });
  });
  s.addText(
    [
      { text: "Nothing is lost when the gate rejects a mail:  ", options: { bold: true, color: NAVY } },
      { text: "it stays in the inbox with a one click Add to calendar button, which opens the same parsed draft for the student to correct and confirm", options: { color: "333333" } },
    ],
    { x: gx, y: gy + 0.16, w: 5.8, h: 0.56, fontFace: SANS, fontSize: 10, margin: 0, lineSpacingMultiple: 1.14 }
  );
}

/* ==========================================================================
   SLIDE 11 - registration links and Google Calendar push
   ========================================================================== */
{
  const s = contentSlide({
    title: "Registration links travel with the event, and one button writes the whole calendar into Google, reversibly",
    kicker: "Screenshots from the live prototype",
    source: "Source: CampusCal event detail views, live IIMA Gmail account, 5 August 2026",
    notes: "Two features, one slide, both shown in the product. The register button removes the search-the-inbox step entirely.",
  });

  fitImage(s, "s212057.png", { x: M + 0.2, y: BODY_Y + 0.34, w: 3.5, h: 3.9, top: true });
  caption(s, "Seminar parsed from mail, with the registration link promoted to a button", M, 5.94, 3.9);
  fitImage(s, "s212041.png", { x: 4.35, y: BODY_Y + 0.34, w: 3.6, h: 3.9, top: true });
  caption(s, "Club event, synced to Google Calendar and traceable to its mail", 4.25, 5.94, 3.8);

  s.addText("Why these two matter", {
    x: 8.5, y: BODY_Y + 0.3, w: 3.9, h: 0.3, fontFace: SANS, fontSize: 12, bold: true, color: NAVY, margin: 0,
  });
  const pts = [
    ["Registration in one tap", "The parser classifies every URL as registration, meeting, resource or tracking, and promotes the registration link to a button on the event"],
    ["Provenance is visible", "Each event states the source label, the layer and the mail it came from, so any student can audit a parse"],
    ["Push is idempotent", "Events are stamped with an internal id, so a second push updates in place and never duplicates"],
    ["Push is reversible", "Events go to a dedicated CampusCal calendar and can all be removed in one click"],
  ];
  let py = BODY_Y + 0.7;
  pts.forEach((p) => {
    s.addShape(pres.ShapeType.line, { x: 8.5, y: py - 0.06, w: 3.9, h: 0, line: { color: G3, width: 0.5 } });
    s.addText(p[0], { x: 8.5, y: py, w: 3.9, h: 0.28, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0 });
    s.addText(p[1], { x: 8.5, y: py + 0.28, w: 3.9, h: 0.68, fontFace: SANS, fontSize: 10, color: "333333", margin: 0, lineSpacingMultiple: 1.14 });
    py += 1.06;
  });
}

/* ==========================================================================
   SLIDE 12 - L6 proof chart: before and after segmentation
   ========================================================================== */
{
  const s = contentSlide({
    title: "The segmentation rework cut unclassified events from 89% to 23% of the calendar, without loosening the surety gate",
    kicker: "Same account, same day, before and after",
    footnotes: [
      "Measured on the same live inbox and the same 118 imported Google Calendar events, before and after the four tier rework on 5 August 2026",
      "Other is retained deliberately: an event with no reliable signal is left unclassified rather than assigned to a category it may not belong to",
    ],
    source: "Source: CampusCal category counters, live IIMA Gmail account, before and after builds of 5 August 2026",
    notes: "This is the proof slide. Classes and Notices absorb most of the reclassification, because the Google Calendar import was previously untouched.",
  });

  // reversed so the horizontal bars read Exams at the top down to Other
  const cats = ["Other", "Notices & admin", "Club events", "Talks & seminars", "Workshops", "Placement", "Classes", "Assignments", "Exams & quizzes"];
  const before = [118, 1, 5, 0, 3, 0, 5, 0, 0];
  const after = [30, 23, 9, 6, 4, 3, 47, 8, 3];

  s.addText("Events on the calendar by category", {
    x: M, y: BODY_Y, w: 7.4, h: 0.3, fontFace: SANS, fontSize: 12, bold: true, color: NAVY, margin: 0,
  });
  s.addText("Number of events¹", {
    x: M, y: BODY_Y + 0.28, w: 7.4, h: 0.26, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0,
  });

  s.addChart(
    pres.ChartType.bar,
    [
      { name: "Before rework", labels: cats, values: before },
      { name: "After rework", labels: cats, values: after },
    ],
    {
      x: M, y: BODY_Y + 0.58, w: 7.5, h: 4.35,
      barDir: "bar", barGrouping: "clustered", barGapWidthPct: 45,
      chartColors: [G3, CYAN],
      showLegend: true, legendPos: "t", legendFontFace: SANS, legendFontSize: 9.5, legendColor: G1,
      showValue: true, dataLabelPosition: "outEnd", dataLabelFontFace: SANS,
      dataLabelFontSize: 9, dataLabelColor: NAVY, dataLabelFormatCode: "0",
      catAxisLabelFontFace: SANS, catAxisLabelFontSize: 9.5, catAxisLabelColor: NAVY,
      valAxisLabelFontFace: SANS, valAxisLabelFontSize: 9, valAxisLabelColor: G1,
      valAxisMinVal: 0, valAxisMaxVal: 130,
      valGridLine: { color: "EDEDED", size: 0.5 },
      catGridLine: { style: "none" },
      catAxisLineShow: true, valAxisLineShow: false,
      border: { pt: 0, color: "FFFFFF" },
    }
  );

  // right rail interpretation
  const rx = 8.35;
  s.addText("What changed", {
    x: rx, y: BODY_Y, w: 4.05, h: 0.3, fontFace: SANS, fontSize: 12, bold: true, color: NAVY, margin: 0,
  });
  s.addShape(pres.ShapeType.line, { x: rx, y: BODY_Y + 0.32, w: 4.05, h: 0, line: { color: NAVY, width: 0.75 } });

  s.addText("89%", { x: rx, y: BODY_Y + 0.46, w: 1.9, h: 0.62, fontFace: SERIF, fontSize: 34, bold: true, color: G1, margin: 0 });
  s.addText("of events sat in Other before", { x: rx, y: BODY_Y + 1.06, w: 1.9, h: 0.42, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0, lineSpacingMultiple: 1.1 });
  s.addText("23%", { x: rx + 2.1, y: BODY_Y + 0.46, w: 1.9, h: 0.62, fontFace: SERIF, fontSize: 34, bold: true, color: CYAN, margin: 0 });
  s.addText("after the four tier rework", { x: rx + 2.1, y: BODY_Y + 1.06, w: 1.9, h: 0.42, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0, lineSpacingMultiple: 1.1 });

  const notes = [
    ["Root cause", "118 imported Google Calendar events were never classified, so they defaulted into Other and masked every other category"],
    ["Fix", "Calendar titles now run through the same classifier as mail, and the keyword vocabulary was widened to 237 terms"],
    ["Result", "103 of 133 events now carry a named category, and 8 of 9 categories are populated"],
    ["Deliberately conservative²", "The remaining 30 are events such as Gym or Team standup, which carry no campus signal at all"],
  ];
  let ny = BODY_Y + 1.72;
  notes.forEach((n) => {
    s.addShape(pres.ShapeType.line, { x: rx, y: ny - 0.06, w: 4.05, h: 0, line: { color: G3, width: 0.5 } });
    s.addText(
      [
        { text: n[0] + ":  ", options: { bold: true, color: NAVY } },
        { text: n[1], options: { color: "333333" } },
      ],
      { x: rx, y: ny, w: 4.05, h: 0.72, fontFace: SANS, fontSize: 10, margin: 0, lineSpacingMultiple: 1.14 }
    );
    ny += 0.8;
  });
}

/* ==========================================================================
   SLIDE 13 - current status matrix
   ========================================================================== */
{
  const s = contentSlide({
    title: "The prototype is complete end to end: every component is built, running and covered by automated checks",
    kicker: "Status as at 5 August 2026",
    footnotes: [
      "126 assertions covering rule coverage, label routing, the denylist, tier precedence, the surety gate, quoted text handling, link extraction and time formats",
    ],
    source: "Source: CampusCal repository; python test_classification.py, 126 passed, 0 failed",
    notes: "Close the status section. Every row is demonstrable live if the panel asks.",
  });

  const rows = [
    ["Gmail ingestion", "Live", "Read only OAuth, 100 mails per page, 45 second poll", "Demonstrated on a real account"],
    ["Segmentation engine", "Live", "4 tiers, 21 rules, 18 labels, 9 categories, 237 keywords", "126 automated checks pass"],
    ["Event extraction", "Live", "5 date formats, 6 time formats, campus venue gazetteer", "Regression cases in the test suite"],
    ["Registration links", "Live", "4 link classes, tracking and unsubscribe links dropped", "Visible on live events"],
    ["Google Calendar read", "Live", "118 events imported and classified from existing calendars", "Class schedule appears in app"],
    ["Google Calendar push", "Live", "Dedicated calendar, idempotent, one click undo", "Verified by repeat push"],
    ["Interface", "Live", "Desktop, tablet and mobile, light and dark themes", "Screenshots on the next page"],
    ["Persistence", "Live", "SQLite with automatic schema migration on start", "Survives restart without data loss"],
  ];

  s.addText("Component", { x: M, y: BODY_Y, w: 2.4, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0 });
  s.addText("Status", { x: M + 2.45, y: BODY_Y, w: 0.9, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0 });
  s.addText("What is implemented", { x: M + 3.4, y: BODY_Y, w: 5.1, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0 });
  s.addText("Evidence¹", { x: M + 8.6, y: BODY_Y, w: 3.25, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0 });
  s.addShape(pres.ShapeType.line, { x: M, y: BODY_Y + 0.3, w: 11.84, h: 0, line: { color: NAVY, width: 0.75 } });

  let y = BODY_Y + 0.42;
  rows.forEach((r) => {
    s.addText(r[0], { x: M, y, w: 2.4, h: 0.5, fontFace: SANS, fontSize: 10.5, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addShape(pres.ShapeType.ellipse, { x: M + 2.45, y: y + 0.17, w: 0.16, h: 0.16, fill: { color: CYAN }, line: { color: CYAN } });
    s.addText(r[1], { x: M + 2.66, y, w: 0.72, h: 0.5, fontFace: SANS, fontSize: 10, color: "333333", margin: 0, valign: "middle" });
    s.addText(r[2], { x: M + 3.4, y, w: 5.1, h: 0.5, fontFace: SANS, fontSize: 10, color: "333333", margin: 0, valign: "middle", lineSpacingMultiple: 1.1 });
    s.addText(r[3], { x: M + 8.6, y, w: 3.25, h: 0.46, fontFace: SANS, fontSize: 10, color: G1, margin: 0, valign: "middle", lineSpacingMultiple: 1.1 });
    y += 0.5;
    s.addShape(pres.ShapeType.line, { x: M, y, w: 11.84, h: 0, line: { color: G3, width: 0.5 } });
  });

  s.addText(
    [
      { text: "Not yet production:  ", options: { bold: true, color: NAVY } },
      { text: "the app runs against one account at a time and polls Gmail rather than subscribing to push notifications, and the extraction layer is deterministic rather than model based. Both are deliberate choices for a prototype, and both are single component swaps.", options: { color: "333333" } },
    ],
    { x: M, y: y + 0.16, w: 11.84, h: 0.44, fontFace: SANS, fontSize: 10.5, margin: 0, lineSpacingMultiple: 1.12 }
  );
}

/* ==========================================================================
   SLIDE 14 - device proof
   ========================================================================== */
{
  const s = contentSlide({
    title: "One build serves desktop, mobile and dark mode, so the calendar is usable wherever mail is read",
    kicker: "Screenshots from the live prototype",
    source: "Source: CampusCal interface, live IIMA Gmail account, 5 August 2026",
    notes: "Close the status section visually. Emphasise that students read mail on the phone, so the phone view is the primary one.",
  });

  // Left column: desktop light above, dark mode below
  s.addText("Desktop, 1,920 px", {
    x: M, y: BODY_Y, w: 6.1, h: 0.28,
    fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0,
  });
  fitImage(s, "s211957.png", { x: M, y: BODY_Y + 0.32, w: 5.9, h: 2.0, top: true });
  caption(s, "Month grid with an always visible agenda rail", M, BODY_Y + 2.4, 5.9);

  s.addText("Dark mode, same build", {
    x: M, y: BODY_Y + 2.66, w: 6.1, h: 0.28,
    fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0,
  });
  fitImage(s, "s212741.png", { x: M, y: BODY_Y + 2.98, w: 5.9, h: 2.0, top: true });
  caption(s, "Theme switched from the top bar, no separate stylesheet", M, BODY_Y + 5.02, 5.9);

  // Right column: phones at full height
  s.addText("Mobile, 320 px", {
    x: 6.85, y: BODY_Y, w: 5.5, h: 0.28,
    fontFace: SANS, fontSize: 11, bold: true, color: NAVY, margin: 0,
  });
  const mobiles = [
    { file: "s212810.png", cap: "Month grid collapses\nto category dots" },
    { file: "s212838.png", cap: "Agenda view,\ngrouped by day" },
    { file: "s212922.png", cap: "Register directly\nfrom the phone" },
  ];
  let mx = 6.95;
  mobiles.forEach((m) => {
    const r = fitImage(s, m.file, { x: mx, y: BODY_Y + 0.34, w: 1.75, h: 3.9, top: true });
    s.addText(m.cap, {
      x: mx - 0.1, y: r.y + r.h + 0.1, w: 1.95, h: 0.5,
      fontFace: SANS, fontSize: 9, color: G1, align: "center", margin: 0, lineSpacingMultiple: 1.1,
    });
    mx += 1.86;
  });

  s.addText(
    [
      { text: "Students read mail on the phone, so the phone view is the primary one:  ", options: { bold: true, color: NAVY } },
      { text: "the sidebar becomes a bottom tab bar and the month grid becomes a dot grid with a tap-through day sheet", options: { color: "333333" } },
    ],
    { x: 6.85, y: 6.42, w: 5.55, h: 0.5, fontFace: SANS, fontSize: 9.5, margin: 0, lineSpacingMultiple: 1.12 }
  );
}

/* ==========================================================================
   SLIDE 15 - L15 closing statement (navy)
   ========================================================================== */
{
  const s = pres.addSlide();
  page += 1;
  s.background = { color: NAVY };
  s.addShape(pres.ShapeType.line, { x: 0.9, y: 1.5, w: 1.5, h: 0, line: { color: CYAN, width: 1.5 } });
  s.addText("From 100 scattered mails to one calendar that fills itself", {
    x: 0.9, y: 1.78, w: 7.4, h: 2.1,
    fontFace: SERIF, fontSize: 34, bold: true, color: WHITE, margin: 0, lineSpacingMultiple: 1.12,
  });
  s.addText("The information was always there. CampusCal removes the only step that was ever manual, and gives every student the same view of the campus that the best informed student has.", {
    x: 0.9, y: 4.0, w: 7.0, h: 1.2,
    fontFace: SANS, fontSize: 13, color: "AFC2CE", margin: 0, lineSpacingMultiple: 1.28,
  });

  const stats = [
    ["133", "events live on the calendar"],
    ["89% to 23%", "unclassified events, before and after"],
    ["126", "automated checks passing"],
    ["0", "events typed in by hand"],
  ];
  let y = 1.72;
  stats.forEach((st) => {
    s.addShape(pres.ShapeType.line, { x: 8.9, y: y - 0.12, w: 3.5, h: 0, line: { color: "1E3A4C", width: 0.75 } });
    s.addText(st[0], { x: 8.9, y, w: 3.5, h: 0.62, fontFace: SERIF, fontSize: 27, bold: true, color: CYAN, margin: 0 });
    s.addText(st[1], { x: 8.9, y: y + 0.58, w: 3.5, h: 0.4, fontFace: SANS, fontSize: 10, color: "AFC2CE", margin: 0, lineSpacingMultiple: 1.1 });
    y += 1.14;
  });

  s.addText("Source: CampusCal prototype, live IIMA Gmail account, 5 August 2026", {
    x: 0.9, y: 6.76, w: 8, h: 0.3, fontFace: SANS, fontSize: 8, color: "6E8794", margin: 0,
  });
  s.addText(String(page), {
    x: 11.9, y: 6.76, w: 0.7, h: 0.3, fontFace: SANS, fontSize: 9, color: "6E8794", align: "right", margin: 0,
  });
  s.addNotes("Close on the governing thought and hand over to the future plans section.");
}

pres.writeFile({ fileName: OUT }).then(() => console.log("WROTE " + OUT));
