/**
 * CampusCal - Agile CCC Ideathon, 5 content slides plus intro and close.
 * McKinsey house style per consulting-slide-builder-v2-1 (16:9, 13.333 x 7.5).
 */
const path = require("path");
const PptxGenJS = require("pptxgenjs");
const { execSync } = require("child_process");
const sizeOf = (p) => {
  const out = execSync(
    `python3 -c "from PIL import Image;im=Image.open('${p}');print(im.size[0],im.size[1])"`
  ).toString().trim().split(" ");
  return { w: +out[0], h: +out[1] };
};

const IMG = path.join(__dirname, "img");
// Note: close the file in PowerPoint before rebuilding, or the write is denied.
const OUT = path.join(__dirname, "CampusCal_AgileCCC_Ideathon_final.pptx");

const NAVY = "051C2C", BLUE = "2251FF", CYAN = "00A9F4", LBLUE = "AAE6F0";
const G1 = "7F7F7F", G2 = "B3B3B3", G3 = "D0D0D0", WHITE = "FFFFFF";
const SERIF = "Georgia", SANS = "Arial";

const M = 0.56, RIGHT = 12.78, CWID = 11.84;
const TITLE_Y = 0.36, RULE_Y = 1.33, BODY_Y = 1.6;
const FOOT_RULE_Y = 7.0, SRC_Y = 7.06;
const SIDEBAR_X = 9.9, EXHIBIT_R = 9.6;

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE";
pres.author = "Agile CCC Ideathon";
pres.title = "CampusCal";

let page = 0;

function contentSlide(o) {
  const s = pres.addSlide();
  page += 1;
  const rightEdge = o.sidebar ? EXHIBIT_R : RIGHT;
  const width = rightEdge - M;

  s.addText(o.title, {
    x: M, y: TITLE_Y, w: width, h: 0.86,
    fontFace: SERIF, fontSize: 22, bold: true, color: NAVY,
    valign: "top", margin: 0, lineSpacingMultiple: 1.08,
  });
  s.addShape(pres.ShapeType.line, { x: M, y: RULE_Y, w: width, h: 0, line: { color: NAVY, width: 0.75 } });
  if (o.kicker) {
    s.addText(o.kicker, {
      x: M, y: RULE_Y + 0.05, w: 6, h: 0.22,
      fontFace: SANS, fontSize: 9, bold: true, underline: true, color: NAVY, margin: 0,
    });
  }
  if (o.footnotes && o.footnotes.length) {
    const txt = o.footnotes.map((f, i) => `${i + 1}. ${f}`).join("\n");
    const h = 0.15 * o.footnotes.length + 0.05;
    s.addText(txt, {
      x: M, y: FOOT_RULE_Y - h - 0.05, w: width, h,
      fontFace: SANS, fontSize: 8, color: G1, margin: 0, lineSpacingMultiple: 1.02,
    });
  }
  s.addShape(pres.ShapeType.line, { x: M, y: FOOT_RULE_Y, w: width, h: 0, line: { color: G3, width: 0.5 } });
  if (o.source) {
    s.addText(o.source, {
      x: M, y: SRC_Y, w: width - 0.8, h: 0.24,
      fontFace: SANS, fontSize: 8, color: G1, margin: 0,
    });
  }
  s.addText(String(page), {
    x: rightEdge - 0.7, y: SRC_Y, w: 0.7, h: 0.24,
    fontFace: SANS, fontSize: 9, color: G1, align: "right", margin: 0,
  });
  if (o.notes) s.addNotes(o.notes);
  return s;
}

function addSidebar(s, headline, paras, stats) {
  s.addShape(pres.ShapeType.rect, {
    x: SIDEBAR_X, y: 0, w: 13.333 - SIDEBAR_X, h: 7.5, fill: { color: NAVY }, line: { color: NAVY },
  });
  const x = SIDEBAR_X + 0.42, w = 13.333 - SIDEBAR_X - 0.84;
  s.addShape(pres.ShapeType.line, { x, y: 0.9, w: 0.62, h: 0, line: { color: WHITE, width: 1.5 } });
  s.addText(headline, {
    x, y: 1.06, w, h: 1.0,
    fontFace: SANS, fontSize: 13, bold: true, color: WHITE, margin: 0, lineSpacingMultiple: 1.12,
  });
  let y = 2.2;
  paras.forEach((p) => {
    s.addText(p, {
      x, y, w, h: 0.9,
      fontFace: SANS, fontSize: 10.5, color: "E8EEF2", margin: 0, lineSpacingMultiple: 1.16,
    });
    y += 0.98;
  });
  (stats || []).forEach((st) => {
    s.addText(st.value, { x, y, w, h: 0.54, fontFace: SERIF, fontSize: 29, bold: true, color: CYAN, margin: 0 });
    s.addText(st.label, { x, y: y + 0.52, w, h: 0.44, fontFace: SANS, fontSize: 9.5, color: "AFC2CE", margin: 0, lineSpacingMultiple: 1.1 });
    y += 1.12;
  });
}

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

function caption(s, text, x, y, w) {
  s.addText(text, {
    x, y, w, h: 0.3,
    fontFace: SANS, fontSize: 8.5, color: G1, align: "center", margin: 0, lineSpacingMultiple: 1.1,
  });
}

function panelHead(s, text, sub, x, y, w) {
  s.addText(text, { x, y, w, h: 0.28, fontFace: SANS, fontSize: 12, bold: true, color: NAVY, margin: 0 });
  if (sub) s.addText(sub, { x, y: y + 0.26, w, h: 0.24, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0 });
}

/* ========================= SLIDE 1: title ========================= */
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  for (let i = 0; i < 14; i++) {
    s.addShape(pres.ShapeType.line, {
      x: 7.6 + i * 0.28, y: 0.4, w: 2.4 - i * 0.06, h: 0,
      line: { color: i % 3 === 0 ? CYAN : BLUE, width: 0.75, transparency: 55 },
      rotate: 62,
    });
  }
  s.addText("CampusCal", {
    x: 0.9, y: 2.22, w: 7.2, h: 0.95,
    fontFace: SERIF, fontSize: 46, bold: true, color: WHITE, margin: 0,
  });
  s.addText("Turning the campus inbox into a calendar that fills itself", {
    x: 0.9, y: 3.18, w: 7.0, h: 1.1,
    fontFace: SERIF, fontSize: 21, color: LBLUE, margin: 0, lineSpacingMultiple: 1.15,
  });
  s.addShape(pres.ShapeType.line, { x: 0.92, y: 4.42, w: 1.5, h: 0, line: { color: CYAN, width: 1.5 } });
  s.addText("Agile CCC Ideathon  |  Solutions Cell submission", {
    x: 0.9, y: 4.62, w: 7, h: 0.3, fontFace: SANS, fontSize: 12, color: WHITE, margin: 0,
  });
  s.addText("Working prototype running on live IIMA Gmail  |  August 2026", {
    x: 0.9, y: 4.96, w: 7, h: 0.3, fontFace: SANS, fontSize: 11, color: "AFC2CE", margin: 0,
  });
  s.addText("Screenshots throughout are from the live prototype and show a real student inbox.", {
    x: 0.9, y: 6.72, w: 8.4, h: 0.3, fontFace: SANS, fontSize: 7.5, color: "6E8794", margin: 0,
  });
  s.addNotes("Governing thought: campus information is not missing, it is scattered across email. CampusCal makes the inbox fill the calendar, and it already runs on live IIMA mail.");
}

/* ========================= SLIDE 2: problem ========================= */
{
  const s = contentSlide({
    title: "Campus information is not missing, it is scattered: 14 mails reached one inbox in four hours",
    kicker: "Live student inbox, not a mock-up",
    sidebar: true,
    footnotes: [
      "Timestamps read from the live inbox capture: 14 mails between 4:59 pm and 9:23 pm on 5 August 2026; the 100 most recent inbox mails span barely a week",
    ],
    source: "Source: CampusCal inbox view, live IIMA Gmail account, 5 August 2026",
    notes: "Two beats: the volume is real (screenshot, timestamps), and the details are all present in the mail. The only missing step is entry, which is manual and therefore never happens.",
  });

  panelHead(s, "What arrives in one evening", "Inbox as captured, most recent first¹", M, BODY_Y, 2.6);
  fitImage(s, "s212850.png", { x: M, y: BODY_Y + 0.56, w: 2.5, h: 3.2, top: true });

  const ax = 3.35, aw = 6.15;
  panelHead(s, "Four carried a dated commitment", "Parsed by CampusCal into calendar events", ax, BODY_Y, aw);

  const rows = [
    ["9:23 pm", "Ideathon case competition", "Club event", "registration link"],
    ["8:15 pm", "Essay writing competition", "Club event", "result date"],
    ["8:00 pm", "Dorm representative elections", "Notice", "voting window"],
    ["5:00 pm", "PLACECOM batch meet, 10 August", "Placement", "dated, compulsory"],
  ];
  let ry = BODY_Y + 0.62;
  s.addShape(pres.ShapeType.line, { x: ax, y: ry, w: aw, h: 0, line: { color: NAVY, width: 0.75 } });
  rows.forEach((r) => {
    s.addText(r[0], { x: ax, y: ry + 0.07, w: 0.9, h: 0.34, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0, valign: "middle" });
    s.addText(r[1], { x: ax + 0.92, y: ry + 0.07, w: 3.0, h: 0.34, fontFace: SANS, fontSize: 10.5, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(r[2], { x: ax + 3.96, y: ry + 0.07, w: 1.1, h: 0.34, fontFace: SANS, fontSize: 9.5, color: BLUE, margin: 0, valign: "middle" });
    s.addText(r[3], { x: ax + 5.06, y: ry + 0.07, w: 1.09, h: 0.34, fontFace: SANS, fontSize: 9.5, color: "444444", margin: 0, valign: "middle" });
    ry += 0.46;
    s.addShape(pres.ShapeType.line, { x: ax, y: ry, w: aw, h: 0, line: { color: G3, width: 0.5 } });
  });
  s.addText("The other 10 were notices, surveys and newsletters, which must never reach a calendar", {
    x: ax, y: ry + 0.1, w: aw, h: 0.3, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0,
  });

  // contrast: assumption vs reality
  panelHead(s, "Why they are still missed", null, ax, ry + 0.56, aw);
  const pairs = [
    ["The student is assumed to read every mail on the day", "Most are skimmed, many are never opened"],
    ["The student is assumed to copy the details into a calendar", "Manual entry is the one step nobody performs"],
    ["Clubs are assumed to publish to a shared calendar", "No shared calendar exists, only email broadcasts"],
  ];
  let py = ry + 0.9;
  s.addShape(pres.ShapeType.line, { x: ax, y: py, w: aw, h: 0, line: { color: NAVY, width: 0.75 } });
  pairs.forEach((p, i) => {
    s.addShape(pres.ShapeType.ellipse, { x: ax, y: py + 0.12, w: 0.22, h: 0.22, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(String(i + 1), { x: ax, y: py + 0.12, w: 0.22, h: 0.22, fontFace: SANS, fontSize: 8, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(p[0], { x: ax + 0.32, y: py + 0.06, w: 2.9, h: 0.38, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0, valign: "middle", lineSpacingMultiple: 1.05 });
    s.addText(p[1], { x: ax + 3.3, y: py + 0.06, w: 2.85, h: 0.38, fontFace: SANS, fontSize: 9.5, bold: true, color: NAVY, margin: 0, valign: "middle", lineSpacingMultiple: 1.05 });
    py += 0.46;
    s.addShape(pres.ShapeType.line, { x: ax, y: py, w: aw, h: 0, line: { color: G3, width: 0.5 } });
  });

  // stat rows under the screenshot
  const stats = [["14", "mails in 4h 24m"], ["100", "on the first inbox page"]];
  let sy2 = 5.56;
  stats.forEach((st) => {
    s.addShape(pres.ShapeType.line, { x: M, y: sy2 - 0.04, w: 2.6, h: 0, line: { color: G3, width: 0.5 } });
    s.addText(st[0], { x: M, y: sy2 + 0.02, w: 0.78, h: 0.44, fontFace: SERIF, fontSize: 21, bold: true, color: BLUE, margin: 0, valign: "middle" });
    s.addText(st[1], { x: M + 0.8, y: sy2 + 0.02, w: 1.8, h: 0.44, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0, valign: "middle", lineSpacingMultiple: 1.08 });
    sy2 += 0.5;
  });

  addSidebar(
    s,
    "Students find out second hand, because reading everything on the day is the only way not to",
    [
      "A quiz notice and a food delivery receipt arrive in the same stream, with the same weight and no ranking.",
      "Every detail needed is already in the mail: date, time, venue, registration link. None of it reaches a calendar.",
    ],
    [{ value: "3 per hour", label: "Average inbound rate across the captured window" }]
  );
}

/* ============== SLIDE 3: solution pipeline + capabilities ============== */
{
  const s = contentSlide({
    title: "CampusCal removes the manual step: it ingests, classifies, extracts and publishes, across six live capabilities",
    source: "Source: CampusCal architecture and codebase, 5,978 lines across backend and frontend, 5 August 2026",
    notes: "Top half is the pipeline, bottom half is what that pipeline delivers. Stress that all six capabilities are running, not planned.",
  });

  const steps = [
    ["A. Ingest", ["Gmail API, read only", "100 mails per page, 45 second poll"]],
    ["B. Classify", ["4 tiers, 18 labels, 9 categories", "Denylist blocks newsletters"]],
    ["C. Extract", ["Date, time, venue, links", "Quoted reply text stripped first"]],
    ["D. Publish", ["Campus layer or personal layer", "One click push to Google Calendar"]],
  ];
  const cw = 2.86, gap = 0.16;
  let x = M;
  steps.forEach((st) => {
    s.addShape(pres.ShapeType.chevron, { x, y: BODY_Y, w: cw, h: 0.68, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(st[0], {
      x: x + 0.44, y: BODY_Y, w: cw - 0.66, h: 0.68,
      fontFace: SANS, fontSize: 12.5, bold: true, color: WHITE, valign: "middle", margin: 0,
    });
    let by = BODY_Y + 0.82;
    st[1].forEach((b) => {
      s.addShape(pres.ShapeType.line, { x, y: by - 0.05, w: cw - 0.2, h: 0, line: { color: G3, width: 0.5 } });
      s.addText(b, { x, y: by, w: cw - 0.24, h: 0.42, fontFace: SANS, fontSize: 10, color: "333333", margin: 0, lineSpacingMultiple: 1.1 });
      by += 0.5;
    });
    x += cw + gap;
  });

  s.addText(
    [
      { text: "Two layers, one pipeline:  ", options: { bold: true, color: NAVY } },
      { text: "broadcasts anyone may attend land on the campus calendar; exams, assignments, classes and placement mail land on the student's own calendar", options: { color: "333333" } },
    ],
    { x: M, y: 3.36, w: CWID, h: 0.34, fontFace: SANS, fontSize: 10.5, margin: 0 }
  );

  s.addShape(pres.ShapeType.line, { x: M, y: 3.82, w: CWID, h: 0, line: { color: NAVY, width: 0.75 } });
  s.addText("Capability", { x: M, y: 3.88, w: 2.3, h: 0.28, fontFace: SANS, fontSize: 10.5, bold: true, color: NAVY, margin: 0 });
  s.addText("What it does in the running build", { x: M + 2.35, y: 3.88, w: 4.5, h: 0.28, fontFace: SANS, fontSize: 10.5, bold: true, color: NAVY, margin: 0 });
  s.addText("Measured scale", { x: M + 6.9, y: 3.88, w: 2.2, h: 0.28, fontFace: SANS, fontSize: 10.5, bold: true, color: NAVY, margin: 0 });
  s.addShape(pres.ShapeType.line, { x: M, y: 4.18, w: 9.0, h: 0, line: { color: G2, width: 0.5 } });

  const feats = [
    ["A. Gmail ingestion", "Reads the inbox over the Gmail API, paged, with a live poll", "100 mails per page"],
    ["B. Segmentation", "Routes each mail to one source label and one category", "18 labels, 9 categories"],
    ["C. Event extraction", "Pulls title, date, time, venue and links from the body", "237 weighted keywords"],
    ["D. Registration links", "Promotes the registration URL to a button on the event", "4 link classes"],
    ["E. Google Calendar sync", "Reads existing calendars, pushes events back reversibly", "118 events read"],
    ["F. Responsive interface", "One codebase across desktop and mobile, with dark mode", "3 breakpoints, 2 themes"],
  ];
  let y = 4.26;
  feats.forEach((f) => {
    s.addText(f[0], { x: M, y, w: 2.3, h: 0.4, fontFace: SANS, fontSize: 10, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(f[1], { x: M + 2.35, y, w: 4.5, h: 0.4, fontFace: SANS, fontSize: 10, color: "333333", margin: 0, valign: "middle" });
    s.addText(f[2], { x: M + 6.9, y, w: 2.2, h: 0.4, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0, valign: "middle" });
    y += 0.42;
    s.addShape(pres.ShapeType.line, { x: M, y, w: 9.0, h: 0, line: { color: G3, width: 0.5 } });
  });

  const rail = [["133", "events live on the calendar"], ["126", "automated checks passing"], ["0", "events typed in by hand"]];
  let sy = 4.24;
  s.addShape(pres.ShapeType.line, { x: 9.72, y: 3.9, w: 0, h: 2.7, line: { color: G3, width: 0.5 } });
  rail.forEach((r) => {
    s.addText(r[0], { x: 9.96, y: sy, w: 2.6, h: 0.56, fontFace: SERIF, fontSize: 29, bold: true, color: BLUE, margin: 0 });
    s.addText(r[1], { x: 9.96, y: sy + 0.54, w: 2.6, h: 0.36, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0 });
    sy += 0.92;
  });
}

/* ============== SLIDE 4: segmentation logic (the USP) ============== */
{
  const s = contentSlide({
    title: "The differentiator is segmentation: four tiers resolve every mail onto 18 source labels and 9 calendar categories",
    kicker: "Rules generated from the student's own Gmail filter export",
    footnotes: [
      "Tier 2 evaluates the same query grammar Gmail uses: from, to, cc, subject, negation, OR and parentheses; subject tags such as [Gen NB] and [PLACECOM] outrank sender rules",
    ],
    source: "Source: backend/rules_engine.py, backend/categories.py; rule set generated from gmail_filters_import.xml, 21 rules covering 18 labels",
    notes: "This is the USP slide. Two points: certainty is tiered, and the two axes are separate so the calendar stays readable while provenance stays auditable.",
  });

  // Left: four tiers
  panelHead(s, "Four tiers, most certain first", "Each mail stops at the first tier that matches", M, BODY_Y, 6.0);
  const tiers = [
    ["Tier 1", "Label already applied by the student's Gmail filters", "Authoritative, zero logic", CYAN],
    ["Tier 2", "The same 21 filter rules, re-evaluated inside the app¹", "112 sender patterns", BLUE],
    ["Tier 3", "Generic senders: LinkedIn, Unstop, Coursera, banks", "9 rules", NAVY],
    ["Tier 4", "Weighted keywords; highest score wins, else Other", "237 keywords", G1],
  ];
  let ty = BODY_Y + 0.58;
  s.addShape(pres.ShapeType.line, { x: M, y: ty, w: 6.0, h: 0, line: { color: NAVY, width: 0.75 } });
  tiers.forEach((t) => {
    s.addShape(pres.ShapeType.rect, { x: M, y: ty + 0.1, w: 0.09, h: 0.38, fill: { color: t[3] }, line: { color: t[3] } });
    s.addText(t[0], { x: M + 0.18, y: ty + 0.04, w: 0.72, h: 0.48, fontFace: SANS, fontSize: 10.5, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(t[1], { x: M + 0.92, y: ty + 0.04, w: 3.55, h: 0.48, fontFace: SANS, fontSize: 10, color: "333333", margin: 0, valign: "middle", lineSpacingMultiple: 1.06 });
    s.addText(t[2], { x: M + 4.5, y: ty + 0.04, w: 1.5, h: 0.48, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0, valign: "middle", lineSpacingMultiple: 1.06 });
    ty += 0.56;
    s.addShape(pres.ShapeType.line, { x: M, y: ty, w: 6.0, h: 0, line: { color: G3, width: 0.5 } });
  });

  // surety gate, the second half of why classification can be trusted
  s.addText("Classification alone does not create an event", {
    x: M, y: ty + 0.16, w: 6.0, h: 0.28, fontFace: SANS, fontSize: 12, bold: true, color: NAVY, margin: 0,
  });
  const gates = [
    ["A parseable, future date", "quoted reply text stripped first, so an older message cannot create a phantom event"],
    ["A corroborating signal", "a time, a venue, or event language; a vague date needs one of them"],
    ["Not already on the calendar", "deduplicated on Gmail message id, and on same title with same date"],
  ];
  let gy = ty + 0.5;
  s.addShape(pres.ShapeType.line, { x: M, y: gy, w: 6.0, h: 0, line: { color: NAVY, width: 0.75 } });
  gates.forEach((g, i) => {
    s.addShape(pres.ShapeType.ellipse, { x: M, y: gy + 0.11, w: 0.2, h: 0.2, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(String(i + 1), { x: M, y: gy + 0.11, w: 0.2, h: 0.2, fontFace: SANS, fontSize: 7.5, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(g[0], { x: M + 0.3, y: gy + 0.05, w: 1.95, h: 0.36, fontFace: SANS, fontSize: 9.5, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(g[1], { x: M + 2.3, y: gy + 0.05, w: 3.7, h: 0.36, fontFace: SANS, fontSize: 9, color: "444444", margin: 0, valign: "middle", lineSpacingMultiple: 1.05 });
    gy += 0.42;
    s.addShape(pres.ShapeType.line, { x: M, y: gy, w: 6.0, h: 0, line: { color: G3, width: 0.5 } });
  });
  s.addText("Rejected mail is not lost: it keeps a one click Add to calendar button that opens the same parsed draft for the student to confirm", {
    x: M, y: gy + 0.08, w: 6.0, h: 0.4, fontFace: SANS, fontSize: 9, color: G1, margin: 0, lineSpacingMultiple: 1.12,
  });

  // Right: the two axes
  panelHead(s, "Two axes decide where it lands", "Provenance and colour are kept separate", 7.0, BODY_Y, 5.4);
  s.addText("Axis 1: source label, 18 values²", {
    x: 7.0, y: BODY_Y + 0.6, w: 5.4, h: 0.26, fontFace: SANS, fontSize: 10, bold: true, color: NAVY, margin: 0,
  });
  s.addText("Exam Notices, Assignments & Quizzes, Placement Committee, Career Clubs, Other Clubs, Seminars & Talks, Section Admin, REM & Doubt Sessions, Course Forums, General Notice Board, Student Governance, SIF, Hostel & Facilities, Wellness, Library, The Ken, Form Receipts, Personal & Govt", {
    x: 7.0, y: BODY_Y + 0.86, w: 5.4, h: 0.66, fontFace: SANS, fontSize: 8.5, color: "444444", margin: 0, lineSpacingMultiple: 1.14,
  });
  s.addText("Decides the calendar layer and carries provenance on every event. Four labels are denylisted and never create events: The Ken, Form Receipts, Library, Personal & Govt", {
    x: 7.0, y: BODY_Y + 1.48, w: 5.4, h: 0.4, fontFace: SANS, fontSize: 9, color: G1, margin: 0, lineSpacingMultiple: 1.12,
  });

  s.addText("Axis 2: category, 9 values", {
    x: 7.0, y: BODY_Y + 1.84, w: 5.4, h: 0.26, fontFace: SANS, fontSize: 10, bold: true, color: NAVY, margin: 0,
  });
  const cats = [
    ["Exams & quizzes", "E5484D"], ["Assignments", "F97316"], ["Classes", "3B82F6"],
    ["Placement", "6366F1"], ["Workshops", "10B981"], ["Talks & seminars", "14B8A6"],
    ["Club events", "A855F7"], ["Notices & admin", "D97706"], ["Other", "8B8D98"],
  ];
  let cx = 7.0, cy = BODY_Y + 2.14;
  cats.forEach((c, i) => {
    s.addShape(pres.ShapeType.rect, { x: cx, y: cy + 0.07, w: 0.15, h: 0.15, fill: { color: c[1] }, line: { color: c[1] } });
    s.addText(c[0], { x: cx + 0.24, y: cy, w: 1.55, h: 0.3, fontFace: SANS, fontSize: 9.5, color: NAVY, margin: 0, valign: "middle" });
    cx += 1.82;
    if ((i + 1) % 3 === 0) { cx = 7.0; cy += 0.34; }
  });
  s.addText("Drives colour on the calendar and the category filter. Nine colours read cleanly on a month grid; eighteen do not", {
    x: 7.0, y: cy + 0.06, w: 5.4, h: 0.44, fontFace: SANS, fontSize: 9, color: G1, margin: 0, lineSpacingMultiple: 1.12,
  });

  // worked example strip
  s.addShape(pres.ShapeType.line, { x: 7.0, y: cy + 0.62, w: 5.4, h: 0, line: { color: NAVY, width: 0.75 } });
  s.addText("Worked example, one real inbox mail", {
    x: 7.0, y: cy + 0.7, w: 5.4, h: 0.26, fontFace: SANS, fontSize: 10, bold: true, color: NAVY, margin: 0,
  });
  s.addText(
    [
      { text: "“Re: [COMPETITION] Brand Baazigar 2026” from niche@iima.ac.in.  ", options: { color: "333333" } },
      { text: "Tier 2 matches the Career Clubs rule; that label maps to Workshops by default; the word COMPETITION scores higher within the activity set, so the category becomes Club events; Career Clubs is a broadcast label, so it lands on the campus calendar", options: { color: "333333" } },
    ],
    { x: 7.0, y: cy + 0.96, w: 5.4, h: 0.86, fontFace: SANS, fontSize: 9, margin: 0, lineSpacingMultiple: 1.14 }
  );
}

/* ============== SLIDE 5: segmentation proof ============== */
{
  const s = contentSlide({
    title: "The tiered rework cut unclassified events from 89% to 23% of the calendar, without loosening the surety gate",
    kicker: "Same account, same day, before and after",
    footnotes: [
      "Measured on the same live inbox and the same 118 imported Google Calendar events, before and after the tiered rework on 5 August 2026",
      "The surety gate still applies: an explicit future date plus a time, a venue or event language, with quoted reply text stripped and past or duplicate events skipped",
    ],
    source: "Source: CampusCal category counters, live IIMA Gmail account, before and after builds of 5 August 2026",
    notes: "The proof slide. Name the root cause honestly: the imported Google Calendar events were never classified and masked every other category.",
  });

  const cats = ["Other", "Notices & admin", "Club events", "Talks & seminars", "Workshops", "Placement", "Classes", "Assignments", "Exams & quizzes"];
  const before = [118, 1, 5, 0, 3, 0, 5, 0, 0];
  const after = [30, 23, 9, 6, 4, 3, 47, 8, 3];

  panelHead(s, "Events on the calendar by category", "Number of events¹", M, BODY_Y, 7.4);
  s.addChart(
    pres.ChartType.bar,
    [
      { name: "Before rework", labels: cats, values: before },
      { name: "After rework", labels: cats, values: after },
    ],
    {
      x: M, y: BODY_Y + 0.5, w: 7.5, h: 4.4,
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

  const rx = 8.35;
  panelHead(s, "What changed", null, rx, BODY_Y, 4.05);
  s.addShape(pres.ShapeType.line, { x: rx, y: BODY_Y + 0.3, w: 4.05, h: 0, line: { color: NAVY, width: 0.75 } });
  s.addText("89%", { x: rx, y: BODY_Y + 0.44, w: 1.9, h: 0.6, fontFace: SERIF, fontSize: 33, bold: true, color: G1, margin: 0 });
  s.addText("of events sat in Other before", { x: rx, y: BODY_Y + 1.02, w: 1.9, h: 0.42, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0, lineSpacingMultiple: 1.1 });
  s.addText("23%", { x: rx + 2.1, y: BODY_Y + 0.44, w: 1.9, h: 0.6, fontFace: SERIF, fontSize: 33, bold: true, color: CYAN, margin: 0 });
  s.addText("after the tiered rework", { x: rx + 2.1, y: BODY_Y + 1.02, w: 1.9, h: 0.42, fontFace: SANS, fontSize: 9.5, color: G1, margin: 0, lineSpacingMultiple: 1.1 });

  const notes = [
    ["Root cause", "118 imported Google Calendar events were never classified, so they defaulted into Other and masked every other category"],
    ["Fix", "Calendar titles now run through the same four tier classifier as mail, and the keyword vocabulary was widened to 237 terms"],
    ["Result", "103 of 133 events now carry a named category, and 8 of the 9 categories are populated"],
    ["Held back deliberately²", "The remaining 30 are entries such as Gym or Team standup, which carry no campus signal at all"],
  ];
  let ny = BODY_Y + 1.66;
  notes.forEach((n) => {
    s.addShape(pres.ShapeType.line, { x: rx, y: ny - 0.06, w: 4.05, h: 0, line: { color: G3, width: 0.5 } });
    s.addText(
      [
        { text: n[0] + ":  ", options: { bold: true, color: NAVY } },
        { text: n[1], options: { color: "333333" } },
      ],
      { x: rx, y: ny, w: 4.05, h: 0.72, fontFace: SANS, fontSize: 9.5, margin: 0, lineSpacingMultiple: 1.14 }
    );
    ny += 0.78;
  });
}

/* ============== SLIDE 6: the prototype, live ============== */
{
  const s = contentSlide({
    title: "The prototype is live end to end: every capability runs today, on one build, across every device",
    kicker: "Screenshots from the live prototype",
    source: "Source: CampusCal interface and repository; python test_classification.py, 126 passed, 0 failed, 5 August 2026",
    notes: "Close on proof. Offer to demonstrate live: sign in, watch the pipeline classify, open an event, push to Google Calendar.",
  });

  // status strip
  const status = [
    ["Gmail ingestion", "read only, paged"],
    ["Segmentation", "4 tiers, 18 labels"],
    ["Extraction", "5 date, 6 time formats"],
    ["Registration links", "surfaced on the event"],
    ["Google Calendar", "read and reversible push"],
    ["Interface", "desktop, mobile, dark"],
  ];
  let sx = M;
  const sw = CWID / 6;
  status.forEach((st) => {
    s.addShape(pres.ShapeType.ellipse, { x: sx, y: BODY_Y + 0.06, w: 0.15, h: 0.15, fill: { color: CYAN }, line: { color: CYAN } });
    s.addText(st[0], { x: sx + 0.22, y: BODY_Y - 0.02, w: sw - 0.3, h: 0.26, fontFace: SANS, fontSize: 10, bold: true, color: NAVY, margin: 0 });
    s.addText(st[1], { x: sx + 0.22, y: BODY_Y + 0.22, w: sw - 0.3, h: 0.24, fontFace: SANS, fontSize: 9, color: G1, margin: 0 });
    sx += sw;
  });
  s.addShape(pres.ShapeType.line, { x: M, y: BODY_Y + 0.54, w: CWID, h: 0, line: { color: G2, width: 0.5 } });

  // desktop light and dark, left column
  fitImage(s, "s211957.png", { x: M, y: BODY_Y + 0.7, w: 5.9, h: 1.8, top: true });
  caption(s, "Desktop: month grid, agenda rail, campus and personal layers in one view", M, BODY_Y + 2.58, 5.9);

  fitImage(s, "s212741.png", { x: M, y: BODY_Y + 2.96, w: 5.9, h: 1.8, top: true });
  caption(s, "Dark mode: identical layout, theme switched from the top bar", M, BODY_Y + 4.82, 5.9);

  // phones, right column
  const mobiles = [
    { file: "s212810.png", cap: "Month grid becomes\na dot grid" },
    { file: "s212838.png", cap: "Agenda, grouped\nby day" },
    { file: "s212922.png", cap: "Register from\nthe phone" },
  ];
  let mx = 6.95;
  mobiles.forEach((m) => {
    const r = fitImage(s, m.file, { x: mx, y: BODY_Y + 0.7, w: 1.72, h: 3.2, top: true });
    s.addText(m.cap, {
      x: mx - 0.12, y: r.y + r.h + 0.08, w: 1.96, h: 0.44,
      fontFace: SANS, fontSize: 8.5, color: G1, align: "center", margin: 0, lineSpacingMultiple: 1.1,
    });
    mx += 1.86;
  });

  s.addText(
    [
      { text: "126 automated checks pass on every build,  ", options: { bold: true, color: NAVY } },
      { text: "covering rule coverage, label routing, the denylist, tier precedence, the surety gate, quoted reply handling, link extraction and time formats", options: { color: "333333" } },
    ],
    { x: 6.95, y: 6.14, w: 5.45, h: 0.6, fontFace: SANS, fontSize: 9.5, margin: 0, lineSpacingMultiple: 1.14 }
  );
}

/* ============== SLIDE 7: close, demo video ============== */
{
  const s = pres.addSlide();
  page += 1;
  s.background = { color: NAVY };

  const LX = 0.9, LW = 5.4;

  // thesis restated small, so the deck still closes on its argument
  s.addShape(pres.ShapeType.line, { x: LX, y: 1.24, w: 1.5, h: 0, line: { color: CYAN, width: 1.5 } });
  s.addText("From 100 scattered mails to one calendar that fills itself", {
    x: LX, y: 1.42, w: LW, h: 0.34,
    fontFace: SANS, fontSize: 11.5, bold: true, color: LBLUE, margin: 0,
  });

  s.addText("See it running on a live inbox", {
    x: LX, y: 1.86, w: LW, h: 1.5,
    fontFace: SERIF, fontSize: 33, bold: true, color: WHITE, margin: 0, lineSpacingMultiple: 1.1,
  });

  s.addText("A short walkthrough of the working prototype: sign in with Google, watch 100 mails classify in seconds, open a parsed event with its registration link, and push the whole calendar to Google Calendar.", {
    x: LX, y: 3.16, w: LW - 0.1, h: 1.1,
    fontFace: SANS, fontSize: 12, color: "AFC2CE", margin: 0, lineSpacingMultiple: 1.26,
  });

  // demo link block
  s.addShape(pres.ShapeType.line, { x: LX, y: 4.42, w: LW, h: 0, line: { color: "1E3A4C", width: 0.75 } });
  s.addShape(pres.ShapeType.ellipse, {
    x: LX, y: 4.66, w: 0.6, h: 0.6, fill: { color: NAVY }, line: { color: CYAN, width: 1.25 },
  });
  s.addShape(pres.ShapeType.triangle, {
    x: LX + 0.235, y: 4.85, w: 0.2, h: 0.22, fill: { color: CYAN }, line: { color: CYAN }, rotate: 90,
  });
  s.addText("Watch the demo", {
    x: LX + 0.82, y: 4.64, w: LW - 0.82, h: 0.32,
    fontFace: SANS, fontSize: 14, bold: true, color: WHITE, margin: 0,
  });
  s.addText("[ demo video link to be added here ]", {
    x: LX + 0.82, y: 4.98, w: LW - 0.82, h: 0.3,
    fontFace: SANS, fontSize: 12, color: CYAN, underline: true, margin: 0,
  });
  s.addText("The prototype can also be run locally from the submitted repository, against any Google account.", {
    x: LX, y: 5.5, w: LW, h: 0.44,
    fontFace: SANS, fontSize: 10, color: "6E8794", margin: 0, lineSpacingMultiple: 1.14,
  });

  // proof image, dark mode reads naturally against the navy
  const r = fitImage(s, "s212741.png", { x: 6.5, y: 1.42, w: 5.9, h: 2.5, top: true });
  s.addShape(pres.ShapeType.rect, {
    x: r.x, y: r.y, w: r.w, h: r.h, fill: { type: "none" }, line: { color: "1E3A4C", width: 0.75 },
  });
  s.addText("The calendar shown in the demo, built entirely from mail that was already in the inbox", {
    x: r.x, y: r.y + r.h + 0.12, w: r.w, h: 0.3,
    fontFace: SANS, fontSize: 9.5, color: "AFC2CE", align: "center", margin: 0,
  });

  // closing evidence strip
  const stats = [
    ["133", "events live on the calendar"],
    ["89% to 23%", "unclassified, before and after"],
    ["126", "automated checks passing"],
    ["0", "events typed in by hand"],
  ];
  const sx0 = 6.5, sw = 5.9 / 2, sh = 0.86;
  stats.forEach((st, i) => {
    const cx = sx0 + (i % 2) * sw;
    const cy = 4.62 + Math.floor(i / 2) * sh;
    s.addShape(pres.ShapeType.line, { x: cx, y: cy - 0.1, w: sw - 0.2, h: 0, line: { color: "1E3A4C", width: 0.75 } });
    s.addText(st[0], { x: cx, y: cy, w: sw - 0.2, h: 0.46, fontFace: SERIF, fontSize: 22, bold: true, color: CYAN, margin: 0 });
    s.addText(st[1], { x: cx, y: cy + 0.44, w: sw - 0.2, h: 0.34, fontFace: SANS, fontSize: 9.5, color: "AFC2CE", margin: 0 });
  });

  s.addText("Source: CampusCal prototype, live IIMA Gmail account, 5 August 2026", {
    x: LX, y: 6.76, w: 8, h: 0.3, fontFace: SANS, fontSize: 8, color: "6E8794", margin: 0,
  });
  s.addText(String(page), {
    x: 11.9, y: 6.76, w: 0.7, h: 0.3, fontFace: SANS, fontSize: 9, color: "6E8794", align: "right", margin: 0,
  });
  s.addNotes("Final slide. Paste the demo video URL over the bracketed placeholder, and hyperlink the 'Watch the demo' line to the same URL. Offer a live walkthrough if the panel prefers it to the recording.");
}

pres.writeFile({ fileName: OUT }).then(() => console.log("WROTE " + OUT));
