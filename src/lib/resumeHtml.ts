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

export const A4_W = 794;
export const A4_H = 1123;

/**
 * Monochrome A4 resume.
 *
 * Black and white on purpose: colour blocks are the part of a designed resume
 * that ATS parsers most often mangle, and grey ink is what a recruiter's
 * photocopy or black-and-white print turns colour into anyway. Hierarchy here
 * comes from weight, size, case and rules — never from colour — so the page
 * survives being printed, scanned and forwarded.
 */
export function renderResumeHtml(d: Resume, keywords: string[] = []): string {
  const hl = (t: string) => highlight(t, keywords);

  const skills = d.skills
    .map(
      (s) =>
        `<div class="skill"><b>${esc(s.label)}</b><div class="chips">${s.items
          .map((i) => `<em>${hl(i)}</em>`)
          .join("")}</div></div>`
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
                  }</div><ul>${p.bullets.map((b) => `<li>${hl(b)}</li>`).join("")}</ul>`
              )
              .join("");
            return `<div class="track">${esc(g.track)}</div>${projs}`;
          })
          .join("");
      }
      if (j.bullets) inner += `<ul>${j.bullets.map((b) => `<li>${hl(b)}</li>`).join("")}</ul>`;
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
        .map((s) => `<li>${hl(s)}</li>`)
        .join("")}</ul>`
    : "";
  const c = d.contact;

  /* One contact line. Dropping empty fields stops a stray " · · " appearing
     for anyone whose resume has no portfolio or LinkedIn. */
  const contact = [
    esc(c.phone),
    esc(c.email),
    esc(c.location),
    c.linkedin ? `<a href="${c.linkedinUrl}">${esc(c.linkedin)}</a>` : "",
    c.portfolio ? `<a href="${c.portfolioUrl}">${esc(c.portfolio)}</a>` : "",
  ]
    .filter(Boolean)
    .join('<span class="sep">·</span>');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
:root{ --ink:#000; --body:#1a1a1a; --mid:#3d3d3d; --soft:#5e5e5e; --rule:#c8c8c8; }
*{ box-sizing:border-box; margin:0; padding:0; }
/* margin:0 leaves the browser no room for its URL / date / page-number
   header & footer, so they are not printed. Spacing on continuation pages
   comes from .body padding repeated per page (box-decoration-break). */
@page{ size:A4; margin:0; }
html,body{ background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body{ font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; color:var(--body);
      font-size:10.6px; line-height:1.43; }
.body{ padding:30px 40px 34px; -webkit-box-decoration-break:clone; box-decoration-break:clone; }

/* ============ HEADER ============ */
.hd{ text-align:center; padding-bottom:11px; border-bottom:2.2px solid var(--ink); margin-bottom:3px; }
.hd .name{ font-size:28px; font-weight:400; letter-spacing:5.5px; color:var(--ink);
           text-transform:uppercase; line-height:1.1; }
.hd .role{ font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;
           color:var(--ink); margin-top:7px; }
.hd .sub{ font-size:9.4px; color:var(--mid); margin-top:4px; letter-spacing:.2px; }
.hd .ct{ font-size:9.3px; color:var(--mid); margin-top:8px; }
.hd .ct a{ color:var(--mid); text-decoration:none; }
.hd .sep{ padding:0 6px; color:var(--soft); }
/* thin second rule = a printed "double rule"; a classic, cheap signal of care */
.hd2{ border-bottom:.6px solid var(--ink); margin-bottom:12px; }

/* ============ SECTIONS ============ */
h2{ font-size:10.6px; font-weight:700; color:var(--ink); text-transform:uppercase;
    letter-spacing:2px; padding-bottom:2.5px; margin:13px 0 6px;
    border-bottom:1px solid var(--ink); break-after:avoid; }
h2:first-child{ margin-top:0; }
p.summary{ text-align:justify; margin-bottom:5px; }

/* ============ SKILLS ============ */
.skill{ display:flex; gap:10px; margin-bottom:3.5px; align-items:baseline; break-inside:avoid; }
.skill b{ color:var(--ink); min-width:112px; flex:none; font-size:9.9px; font-weight:700; }
.chips{ display:block; line-height:1.5; }
.chips em{ font-style:normal; color:var(--body); font-size:10.2px; }
.chips em:not(:last-child)::after{ content:", "; color:var(--soft); }

/* ============ EXPERIENCE ============ */
/* No timeline rail: in one ink a vertical rule competes with the text for
   attention. Whitespace plus a bold company name separates entries better. */
.job{ margin-bottom:10px; break-inside:auto; }
.job:last-of-type{ margin-bottom:0; }
.jh{ display:flex; justify-content:space-between; align-items:baseline; break-after:avoid; }
.jh .co{ font-size:11.4px; font-weight:700; color:var(--ink); }
.jh .co .r{ font-style:italic; font-weight:400; font-size:10px; color:var(--body); }
.jh .date{ color:var(--ink); font-size:9.2px; white-space:nowrap; padding-left:12px; font-weight:700; }
.place{ color:var(--soft); font-style:italic; font-size:8.8px; margin:1.5px 0 2px; }
.track{ font-size:8.9px; font-weight:700; letter-spacing:1.4px; color:var(--ink);
        text-transform:uppercase; margin:7px 0 2px; padding-bottom:1.5px;
        border-bottom:.6px solid var(--rule); break-after:avoid; }
.proj{ font-size:10.1px; margin-top:4.5px; break-after:avoid; }
.proj b{ color:var(--ink); font-weight:700; }
.proj span{ color:var(--soft); font-style:italic; font-size:9.5px; }

/* ============ BULLETS ============ */
ul{ list-style:none; margin:2px 0 0; }
li{ position:relative; padding-left:12px; margin-bottom:1.5px; break-inside:avoid; }
/* a small square prints crisper than a round dot at this size */
li::before{ content:""; position:absolute; left:1px; top:5.2px; width:3.2px; height:3.2px;
            background:var(--ink); }
ul.strengths li::before{ width:3.2px; height:3.2px; background:#fff; border:1px solid var(--ink); }

/* ============ EDUCATION ============ */
.edu{ display:flex; justify-content:space-between; align-items:baseline; margin-bottom:3px; break-inside:avoid; }
.edu b{ font-size:10.1px; color:var(--ink); }
.edu i{ color:var(--mid); font-style:italic; font-size:9.3px; }
.edu .date{ color:var(--ink); font-size:9.2px; font-weight:700; white-space:nowrap; padding-left:12px; }

/* on-screen keyword highlighting — grey, so it still reads if printed */
mark{ background:#e4e4e4; color:inherit; padding:0 1px; border-bottom:.8px solid #8f8f8f; }
</style></head><body>
<div class="body">
  <div class="hd">
    <div class="name">${esc(d.name)}</div>
    <div class="role">${esc(d.title)}</div>
    <div class="sub">${esc(d.subtitle)}</div>
    <div class="ct">${contact}</div>
  </div>
  <div class="hd2"></div>

  <h2>Professional Summary</h2>
  ${d.summary.map((p) => `<p class="summary">${hl(p)}</p>`).join("")}
  <h2>Technical Skills</h2>${skills}
  <h2>Professional Experience</h2>${jobs}
  ${strengths}
  <h2>Education</h2>${edu}
</div></body></html>`;
}
