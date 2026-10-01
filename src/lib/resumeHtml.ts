import type { Resume } from "../types";

const esc = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Wrap JD keywords found in the text with a highlight mark. */
function highlight(text: string, words: string[]): string {
  let out = esc(text);
  if (!words.length) return out;
  const uniq = Array.from(new Set(words.filter((w) => w && w.length > 2)))
    .sort((a, b) => b.length - a.length)
    .slice(0, 60)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!uniq.length) return out;
  const re = new RegExp(`(?<![\\w>])(${uniq.join("|")})(?![\\w<])`, "gi");
  return out.replace(re, "<mark>$1</mark>");
}

/**
 * Metrics are what a skimming recruiter's eye actually lands on, so they are
 * set in bold automatically — the page can be read for proof without being
 * read for prose.
 *
 * Only numbers carrying a magnitude marker (+, %, K, M, B, or a thousands
 * comma) qualify. That deliberately excludes version numbers and years, so
 * "React Native 0.85" and "Oct 2025" stay plain. The leading \b also keeps
 * it out of tokens like "ES6+", where the digit is not at a word boundary.
 *
 * A years-of-experience count is excluded too. It is a seniority marker, not
 * an achievement, and bolding "2+ years" would spend the reader's attention
 * on the number the candidate is least helped by.
 */
const NOT_YEARS = String.raw`(?!\s*(?:years?|yrs?)\b)`;
const METRIC = new RegExp(
  String.raw`\b\d[\d,]*(?:\.\d+)?\s?[KMB]?[+%]${NOT_YEARS}` +
    String.raw`|\b\d[\d,]*(?:\.\d+)?[KMB]\b${NOT_YEARS}`,
  "gi"
);

const emphasiseMetrics = (html: string) =>
  html.replace(METRIC, (m) => `<strong class="m">${m}</strong>`);

/* ------------------------------------------------------------------ */
/* Key-term emphasis                                                    */
/* ------------------------------------------------------------------ */

/**
 * Engineering signals that show depth but rarely appear in a skills list.
 * The rest of the dictionary is built from the resume's own skills, so this
 * adapts to whoever is using the app rather than hard-coding one career.
 */
const SIGNAL_TERMS = [
  "database-per-tenant", "multi-tenant", "offline-first", "end-to-end", "zero-downtime",
  "conflict resolution", "background sync", "idempotent", "connection pool",
  "ABDM", "ABHA", "HIP bridge", "scan-and-share", "Meta Cloud API",
  "Azure Document Intelligence", "speech-to-text", "text-to-speech", "sentiment analysis",
  "vector search", "semantic search", "proctoring", "slot locking", "webhooks",
  "Broadcast Receivers", "native modules", "foreground service", "push notifications",
  "STT", "TTS", "LLM", "OCR", "RAG", "RBAC", "JWT", "OTP", "OpenAPI", "CI/CD",
  "microservices", "load balancing", "rate limiting", "caching", "sharding",
];

const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Terms worth emphasising: the resume's own skills, plus the signal list. */
function buildTerms(d: Resume): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    const t = s.trim();
    // 3+ chars keeps "AI", "UI" and stray letters out; they are too common to carry weight
    if (t.length > 2) out.add(t);
  };
  for (const group of d.skills) {
    for (const raw of group.items) {
      // "Kotlin (Native Modules)" -> "Kotlin" + "Native Modules"
      add(raw.replace(/\s*\(.*$/, ""));
      const inner = raw.match(/\(([^)]*)\)/)?.[1];
      if (inner) inner.split(/[,/]/).forEach(add);
    }
  }
  SIGNAL_TERMS.forEach(add);
  // longest first, so "WhatsApp Cloud API" wins over "WhatsApp"
  return [...out].sort((a, b) => b.length - a.length);
}

/** Run `fn` over the text between tags only, never over the tags themselves. */
const mapText = (html: string, fn: (t: string) => string) =>
  html
    .split(/(<[^>]+>)/)
    .map((part) => (part.startsWith("<") ? part : fn(part)))
    .join("");

/**
 * Emphasis earns its keep only while it stays rare — a page where everything
 * is bold reads exactly like a page where nothing is. Two budgets keep the
 * density down: at most 2 terms per bullet, and any one term at most twice in
 * the whole resume, so a word like "real-time" cannot carpet the page.
 *
 * Returns a stateful function; build a new one per render.
 */
function makeTermEmphasiser(terms: string[]) {
  const PER_BULLET = 2;
  const PER_DOC = 2;
  const used = new Map<string, number>();

  return (html: string): string => {
    let placed = 0;
    return mapText(html, (text) => {
      let out = text;
      for (const term of terms) {
        if (placed >= PER_BULLET) break;
        if ((used.get(term) ?? 0) >= PER_DOC) continue;
        const re = new RegExp(`(?<![\\w-])(${reEsc(term)})(?![\\w-])`, "i");
        if (!re.test(out)) continue;
        out = out.replace(re, '<strong class="k">$1</strong>');
        used.set(term, (used.get(term) ?? 0) + 1);
        placed++;
      }
      return out;
    });
  };
}

export type EmphasisMode = "off" | "metrics" | "full";

export const EMPHASIS: { id: EmphasisMode; label: string; note: string }[] = [
  { id: "off", label: "Off", note: "Plain text — no automatic bolding anywhere." },
  { id: "metrics", label: "Numbers", note: "Bolds every metric, so the eye lands on your proof first." },
  { id: "full", label: "Numbers + work", note: "Also bolds the key technology in each bullet — capped at 2 per bullet so it stays scannable." },
];

export const isEmphasis = (v: unknown): v is EmphasisMode =>
  EMPHASIS.some((e) => e.id === v);

/* ------------------------------------------------------------------ */
/* Text size                                                           */
/* ------------------------------------------------------------------ */

export const SCALE_MIN = 0.8;
export const SCALE_MAX = 1.2;
export const SCALE_STEP = 0.05;

export const clampScale = (n: unknown): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 1;
  // round to the step so repeated +/- cannot drift to 0.9000000000000001
  const stepped = Math.round(v / SCALE_STEP) * SCALE_STEP;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Number(stepped.toFixed(2))));
};

export const A4_W = 794;
export const A4_H = 1123;

export type TemplateId = "classic" | "modern" | "compact" | "ats";

export const TEMPLATES: { id: TemplateId; label: string; note: string }[] = [
  { id: "classic", label: "Classic", note: "Monochrome, centred header. The safe default — prints and photocopies cleanly." },
  { id: "modern", label: "Modern", note: "Navy header band. For design-led companies, startups and agencies." },
  { id: "compact", label: "Compact", note: "Same content, tighter spacing. Use when the resume runs onto an extra page." },
  { id: "ats", label: "Plain ATS", note: "No flourishes, Arial, plain rules. For job-portal uploads and strict parsers." },
];

export const isTemplate = (v: unknown): v is TemplateId =>
  TEMPLATES.some((t) => t.id === v);

/* ------------------------------------------------------------------ */
/* Shared markup — every template renders the same content, so the     */
/* text an ATS extracts never changes with the look.                   */
/* ------------------------------------------------------------------ */
function sections(d: Resume, hl: (t: string) => string, emphasis: EmphasisMode) {
  /* Prose carries the emphasis; the skills list does not, since bolding inside
     a comma-separated run of skills only makes it noisier. */
  const terms = emphasis === "full" ? makeTermEmphasiser(buildTerms(d)) : null;
  const hlb = (t: string) => {
    if (emphasis === "off") return hl(t);
    const withMetrics = emphasiseMetrics(hl(t));
    return terms ? terms(withMetrics) : withMetrics;
  };
  /* Separators are real text nodes, not CSS ::after content. Generated
     content is not part of the document text, so a parser reading the HTML
     would otherwise see "ReactNext.jsTypeScript" with nothing between. */
  const skills = d.skills
    .map(
      (s) =>
        `<div class="skill"><b>${esc(s.label)}</b><div class="chips">${s.items
          .map((i) => `<em>${hl(i)}</em>`)
          .join(", ")}</div></div>`
    )
    .join("");

  const jobs = d.experience
    .map((j) => {
      let inner = j.place ? `<div class="place">${esc(j.place)}</div>` : "";
      if (j.groups) {
        inner += j.groups
          .map((g) => {
            const projs = g.projects
              .map(
                (p) =>
                  `<div class="proj"><b>${esc(p.title)}</b>${
                    p.meta ? ` <span>— ${esc(p.meta)}</span>` : ""
                  }</div><ul>${p.bullets.map((b) => `<li>${hlb(b)}</li>`).join("")}</ul>`
              )
              .join("");
            return `<div class="track">${esc(g.track)}</div>${projs}`;
          })
          .join("");
      }
      if (j.bullets) inner += `<ul>${j.bullets.map((b) => `<li>${hlb(b)}</li>`).join("")}</ul>`;
      return `<div class="job"><div class="jh"><div class="co">${esc(
        j.company
      )} <span class="r">— ${esc(j.role)}</span></div><div class="date">${esc(
        j.date
      )}</div></div>${inner}</div>`;
    })
    .join("");

  const edu = d.education
    .map(
      (e) =>
        `<div class="edu"><span><b>${esc(e.deg)}</b><br><i>${esc(
          e.inst
        )}</i></span><span class="date">${esc(e.date)}</span></div>`
    )
    .join("");

  /* Optional section: emptying coreStrengths must drop the heading too, not
     leave a bare "Core Strengths" rule above nothing. */
  const strengths = (d.coreStrengths ?? []).length
    ? `<h2>Core Strengths</h2><ul class="strengths">${d.coreStrengths
        .map((s) => `<li>${hlb(s)}</li>`)
        .join("")}</ul>`
    : "";

  const c = d.contact;
  /* Dropping empty fields stops a stray separator for anyone whose resume
     has no portfolio or LinkedIn. */
  const contactBits = [
    esc(c.phone),
    esc(c.email),
    esc(c.location),
    c.linkedin ? `<a href="${c.linkedinUrl}">${esc(c.linkedin)}</a>` : "",
    c.portfolio ? `<a href="${c.portfolioUrl}">${esc(c.portfolio)}</a>` : "",
  ].filter(Boolean);

  const body = `
  <h2>Professional Summary</h2>
  ${d.summary.map((p) => `<p class="summary">${hlb(p)}</p>`).join("")}
  <h2>Technical Skills</h2>${skills}
  <h2>Professional Experience</h2>${jobs}
  ${strengths}
  <h2>Education</h2>${edu}`;

  return { body, contactBits };
}

/* ------------------------------------------------------------------ */
/* Structure shared by every template. Colour, size and the header are  */
/* layered on top per template, so these rules stay in one place.       */
/* ------------------------------------------------------------------ */
const BASE_CSS = `
*{ box-sizing:border-box; margin:0; padding:0; }
/* margin:0 leaves the browser no room for its URL / date / page-number
   header & footer, so they are not printed. Spacing on continuation pages
   comes from .body padding repeated per page (box-decoration-break). */
@page{ size:A4; margin:0; }
html,body{ background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.body{ -webkit-box-decoration-break:clone; box-decoration-break:clone; }
h2:first-child{ margin-top:0; }
p.summary{ text-align:justify; }
.skill{ display:flex; gap:10px; align-items:baseline; break-inside:avoid; }
.skill b{ flex:none; }
.chips{ display:block; }
.chips em{ font-style:normal; }
.jh{ display:flex; justify-content:space-between; align-items:baseline; break-after:avoid; }
.jh .date{ white-space:nowrap; padding-left:12px; }
/* auto-emphasis — weight only, so it survives a mono print */
strong.m, strong.k{ font-weight:700; color:inherit; }
.track, .proj, h2{ break-after:avoid; }
ul{ list-style:none; margin:2px 0 0; }
li{ position:relative; break-inside:avoid; }
.edu{ display:flex; justify-content:space-between; align-items:baseline; break-inside:avoid; }
.edu .date{ white-space:nowrap; padding-left:12px; }
.hd a{ text-decoration:none; }
`;

/* ---------------- Classic — monochrome, centred ---------------- */
const CLASSIC_CSS = `
:root{ --ink:#000; --body:#1a1a1a; --mid:#3d3d3d; --soft:#5e5e5e; --rule:#c8c8c8; }
body{ font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; color:var(--body); font-size:10.6px; line-height:1.43; }
.body{ padding:30px 40px 34px; }
.hd{ text-align:center; padding-bottom:11px; border-bottom:2.2px solid var(--ink); margin-bottom:3px; }
.hd .name{ font-size:28px; font-weight:400; letter-spacing:5.5px; color:var(--ink); text-transform:uppercase; line-height:1.1; }
.hd .role{ font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink); margin-top:7px; }
.hd .sub{ font-size:9.4px; color:var(--mid); margin-top:4px; }
.hd .ct{ font-size:9.3px; color:var(--mid); margin-top:8px; }
.hd .ct a{ color:var(--mid); }
.hd .sep{ padding:0 6px; color:var(--soft); }
/* thin second rule = a printed "double rule"; a cheap, classic signal of care */
.hd2{ border-bottom:.6px solid var(--ink); margin-bottom:12px; }
h2{ font-size:10.6px; font-weight:700; color:var(--ink); text-transform:uppercase; letter-spacing:2px;
    padding-bottom:2.5px; margin:13px 0 6px; border-bottom:1px solid var(--ink); }
p.summary{ margin-bottom:5px; }
.skill{ margin-bottom:3.5px; } .skill b{ color:var(--ink); min-width:112px; font-size:9.9px; font-weight:700; }
.chips{ line-height:1.5; } .chips em{ color:var(--body); font-size:10.2px; }
/* No timeline rail: in one ink a vertical rule competes with the text for
   attention. Whitespace plus a bold company name separates entries better. */
.job{ margin-bottom:10px; } .job:last-of-type{ margin-bottom:0; }
.jh .co{ font-size:11.4px; font-weight:700; color:var(--ink); }
.jh .co .r{ font-style:italic; font-weight:400; font-size:10px; color:var(--body); }
.jh .date{ color:var(--ink); font-size:9.2px; font-weight:700; }
.place{ color:var(--soft); font-style:italic; font-size:8.8px; margin:1.5px 0 2px; }
.track{ font-size:8.9px; font-weight:700; letter-spacing:1.4px; color:var(--ink); text-transform:uppercase;
        margin:7px 0 2px; padding-bottom:1.5px; border-bottom:.6px solid var(--rule); }
.proj{ font-size:10.1px; margin-top:4.5px; } .proj b{ color:var(--ink); font-weight:700; }
.proj span{ color:var(--soft); font-style:italic; font-size:9.5px; }
li{ padding-left:12px; margin-bottom:1.5px; }
/* a small square prints crisper than a round dot at this size */
li::before{ content:""; position:absolute; left:1px; top:5.2px; width:3.2px; height:3.2px; background:var(--ink); }
ul.strengths li::before{ background:#fff; border:1px solid var(--ink); }
.edu{ margin-bottom:3px; } .edu b{ font-size:10.1px; color:var(--ink); }
.edu i{ color:var(--mid); font-style:italic; font-size:9.3px; }
.edu .date{ color:var(--ink); font-size:9.2px; font-weight:700; }
mark{ background:#e4e4e4; color:inherit; padding:0 1px; border-bottom:.8px solid #8f8f8f; }
`;

/* ---------------- Compact — classic, tightened ---------------- */
const COMPACT_CSS = `${CLASSIC_CSS}
body{ font-size:9.9px; line-height:1.34; }
.body{ padding:22px 32px 24px; }
.hd{ text-align:left; padding-bottom:8px; }
.hd .name{ font-size:23px; letter-spacing:3.5px; }
.hd .role{ font-size:10px; margin-top:4px; }
.hd .sub{ font-size:8.8px; margin-top:2px; }
.hd .ct{ font-size:8.8px; margin-top:5px; }
.hd2{ margin-bottom:8px; }
h2{ font-size:9.9px; letter-spacing:1.6px; margin:9px 0 4px; }
p.summary{ margin-bottom:3px; }
.skill{ margin-bottom:2px; } .skill b{ min-width:100px; font-size:9.3px; }
.chips{ line-height:1.4; } .chips em{ font-size:9.6px; }
.job{ margin-bottom:7px; }
.jh .co{ font-size:10.6px; } .jh .co .r{ font-size:9.4px; }
.track{ margin:5px 0 1px; } .proj{ margin-top:3px; font-size:9.6px; }
li{ margin-bottom:.5px; padding-left:11px; }
li::before{ top:4.8px; width:3px; height:3px; }
.edu{ margin-bottom:2px; }
`;

/* ---------------- Modern — navy header band ---------------- */
const MODERN_CSS = `
:root{ --navy:#012E58; --accent:#2F80ED; --ink:#1f2630; --muted:#5c6672; --soft:#8a93a0; --rule:#e3e8ee; }
body{ font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; color:var(--ink); font-size:10.8px; line-height:1.44; }
.band{ background:var(--navy); color:#fff; padding:24px 34px; }
.band .name{ font-size:32px; font-weight:300; letter-spacing:3px; line-height:1; }
.band .role{ font-size:13px; font-weight:700; margin-top:7px; }
.band .sub{ font-size:9.8px; font-weight:400; color:#bcd2e8; margin-top:3px; }
.band .ct{ font-size:9.2px; color:#eaf1f8; margin-top:9px; }
.band .ct a{ color:#cfe0f2; }
.band .sep{ padding:0 6px; color:#7fa5cc; }
.body{ padding:18px 34px 26px; }
h2{ font-size:12.3px; font-weight:700; color:var(--navy); text-transform:uppercase; letter-spacing:1.5px;
    padding-bottom:4px; margin:12px 0 6px; border-bottom:2px solid var(--navy); }
p.summary{ margin-bottom:6px; }
.skill{ margin-bottom:5px; } .skill b{ color:var(--navy); min-width:122px; font-size:10px; font-weight:700; }
.chips{ line-height:1.55; } .chips em{ color:var(--ink); font-size:10.4px; }
.job{ position:relative; padding:0 0 11px 24px; border-left:2px solid var(--navy); margin-left:7px; }
.job:last-of-type{ padding-bottom:0; border-left-color:transparent; }
.job::before{ content:""; position:absolute; left:-6px; top:3px; width:10px; height:10px; border-radius:50%;
              background:var(--navy); box-shadow:0 0 0 3px #fff; }
.jh .co{ font-size:12px; font-weight:700; } .jh .co .r{ font-style:italic; font-weight:400; font-size:10px; }
.jh .date{ color:var(--muted); font-size:9px; font-weight:600; }
.place{ color:var(--soft); font-style:italic; font-size:8.8px; margin:1px 0 2px; }
.track{ font-size:9.2px; font-weight:700; letter-spacing:1px; color:var(--accent); text-transform:uppercase; margin:7px 0 1px; }
.proj{ font-size:10.2px; margin-top:4px; } .proj b{ color:var(--ink); }
.proj span{ color:var(--soft); font-style:italic; }
li{ padding-left:14px; margin-bottom:1px; }
li::before{ content:""; position:absolute; left:1px; top:6px; width:5px; height:5px; background:var(--accent); border-radius:50%; }
ul.strengths li::before{ background:var(--navy); }
.edu{ margin-bottom:3px; } .edu b{ font-size:10.2px; }
.edu i{ color:var(--muted); font-style:italic; font-size:9.4px; }
.edu .date{ color:var(--muted); font-size:9.2px; font-weight:600; }
mark{ background:#fff3bf; color:inherit; padding:0 1px; border-radius:2px; }
`;

/* ---------------- Plain ATS — nothing decorative ---------------- */
const ATS_CSS = `
body{ font-family:Arial,Helvetica,sans-serif; color:#000; font-size:11px; line-height:1.4; }
.body{ padding:34px 40px; }
.hd{ margin-bottom:10px; }
.hd .name{ font-size:22px; font-weight:700; }
.hd .role{ font-size:12px; font-weight:700; margin-top:3px; }
.hd .sub{ font-size:10.5px; margin-top:2px; }
.hd .ct{ font-size:10.5px; margin-top:5px; }
.hd .ct a{ color:#000; }
.hd .sep{ padding:0 5px; }
h2{ font-size:11.5px; font-weight:700; text-transform:uppercase; margin:12px 0 5px;
    padding-bottom:2px; border-bottom:1px solid #000; }
p.summary{ text-align:left; margin-bottom:5px; }
.skill{ margin-bottom:3px; } .skill b{ min-width:120px; font-size:11px; font-weight:700; }
.chips em{ font-size:11px; }
.job{ margin-bottom:9px; }
.jh .co{ font-size:11.5px; font-weight:700; } .jh .co .r{ font-weight:400; font-size:11px; font-style:normal; }
.jh .date{ font-size:11px; font-weight:700; }
.place{ font-size:10.5px; margin:1px 0 2px; }
.track{ font-size:11px; font-weight:700; text-transform:uppercase; margin:6px 0 2px; }
.proj{ font-size:11px; margin-top:4px; } .proj b{ font-weight:700; } .proj span{ font-style:normal; }
/* a real bullet character, so it survives copy-paste out of the PDF */
li{ padding-left:13px; margin-bottom:1.5px; }
li::before{ content:"\\2022"; position:absolute; left:0; top:0; }
.edu{ margin-bottom:3px; } .edu b{ font-size:11px; } .edu i{ font-style:normal; font-size:10.5px; }
.edu .date{ font-size:11px; font-weight:700; }
mark{ background:#e4e4e4; color:inherit; }
`;

const CSS: Record<TemplateId, string> = {
  classic: CLASSIC_CSS,
  compact: COMPACT_CSS,
  modern: MODERN_CSS,
  ats: ATS_CSS,
};

/**
 * Render the resume as a standalone A4 HTML page.
 *
 * All four templates emit the same markup and the same words — only the
 * stylesheet and the header block change — so switching look can never
 * change what an ATS reads out of the file.
 */
export function renderResumeHtml(
  d: Resume,
  keywords: string[] = [],
  template: TemplateId = "classic",
  emphasis: EmphasisMode = "metrics",
  scale = 1
): string {
  const hl = (t: string) => highlight(t, keywords);
  const { body, contactBits } = sections(d, hl, emphasis);
  const contact = contactBits.join('<span class="sep">·</span>');

  /* `zoom` rather than `transform: scale()`: zoom reflows the text, so lines
     re-wrap and the page count genuinely changes. A transform would only
     shrink the picture and still print the same number of pages. */
  const s = clampScale(scale);
  const zoom = s === 1 ? "" : `body{ zoom:${s}; }`;

  const head = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}${CSS[template]}${zoom}</style></head><body>`;

  const headline = `
    <div class="name">${esc(d.name)}</div>
    <div class="role">${esc(d.title)}</div>
    <div class="sub">${esc(d.subtitle)}</div>
    <div class="ct">${contact}</div>`;

  /* Modern's band is full-bleed, so it sits outside the padded .body */
  if (template === "modern") {
    return `${head}<div class="band">${headline}</div><div class="body">${body}</div></body></html>`;
  }

  const rule = template === "ats" ? "" : `<div class="hd2"></div>`;
  return `${head}<div class="body"><div class="hd">${headline}</div>${rule}${body}</div></body></html>`;
}
