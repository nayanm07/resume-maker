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

  const strengths = d.coreStrengths.map((s) => `<li>${hl(s)}</li>`).join("");
  const c = d.contact;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
:root{ --navy:#012E58; --accent:#2F80ED; --ink:#1f2630; --muted:#5c6672; --soft:#8a93a0; --line:#e3e8ee; }
*{ box-sizing:border-box; margin:0; padding:0; }
/* margin:0 leaves the browser no room for its URL / date / page-number
   header & footer, so they are not printed. Spacing on continuation pages
   comes from .body padding repeated per page (box-decoration-break). */
@page{ size:A4; margin:0; }
html,body{ background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body{ font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; color:var(--ink); font-size:10.9px; line-height:1.45; }
mark{ background:#fff3bf; color:inherit; padding:0 1px; border-radius:2px; }
.band{ background:var(--navy); color:#fff; display:flex; justify-content:space-between; align-items:center; gap:26px; padding:26px 34px; }
.band .name{ font-size:33px; font-weight:300; letter-spacing:3px; line-height:1; }
.band .role{ font-size:13.5px; font-weight:700; margin-top:7px; }
.band .role small{ display:block; font-weight:400; color:#bcd2e8; font-size:10px; margin-top:3px; letter-spacing:.4px; }
.contact{ text-align:right; font-size:9.2px; } .contact div{ margin-bottom:5px; color:#eaf1f8; }
.contact a{ color:#cfe0f2; text-decoration:none; }
.body{ padding:22px 34px 30px; -webkit-box-decoration-break:clone; box-decoration-break:clone; }
h2{ font-size:12.5px; font-weight:700; color:var(--navy); text-transform:uppercase; letter-spacing:1.5px; padding-bottom:4px; margin:11px 0 6px; border-bottom:2px solid var(--navy); }
h2:first-child{ margin-top:0; } p.summary{ text-align:justify; margin-bottom:6px; }
.skill{ display:flex; gap:10px; margin-bottom:5px; align-items:baseline; }
.skill b{ color:var(--navy); min-width:122px; flex:none; font-size:10px; }
.chips{ display:block; line-height:1.55; } .chips em{ font-style:normal; color:var(--ink); font-size:10.4px; }
.chips em:not(:last-child)::after{ content:", "; color:var(--muted); }
.timeline{ position:relative; margin:4px 0 0 7px; }
.job{ position:relative; padding:0 0 11px 26px; border-left:2px solid var(--navy); }
.job:last-of-type{ padding-bottom:0; border-left-color:transparent; } .job:first-of-type{ padding-top:1px; }
.job:first-of-type::after{ content:""; position:absolute; left:-2px; top:-6px; width:6px; height:9px; background:#fff; }
.job::before{ content:""; position:absolute; left:-6px; top:2px; width:11px; height:11px; border-radius:50%; background:var(--navy); box-shadow:0 0 0 3px #fff; }
.jh{ display:flex; justify-content:space-between; align-items:baseline; break-after:avoid; }
.jh .co{ font-size:12px; font-weight:700; } .jh .co .r{ font-style:italic; font-weight:400; font-size:10px; }
.jh .date{ color:var(--muted); font-size:9px; white-space:nowrap; padding-left:10px; font-weight:600; }
.place{ color:var(--soft); font-style:italic; font-size:8.8px; margin:1px 0 2px; }
.track{ font-size:9.2px; font-weight:700; letter-spacing:1px; color:var(--accent); text-transform:uppercase; margin:6px 0 1px; }
.proj{ font-size:10.2px; margin-top:4px; break-after:avoid; } .proj b{ color:var(--ink); } .proj span{ color:var(--soft); font-style:italic; }
ul{ list-style:none; margin:2px 0 0; } li{ position:relative; padding-left:14px; margin-bottom:1px; break-inside:avoid; }
li::before{ content:""; position:absolute; left:1px; top:6px; width:5px; height:5px; background:var(--accent); border-radius:50%; }
ul.strengths li::before{ background:var(--navy); }
.edu{ display:flex; justify-content:space-between; align-items:baseline; margin-bottom:3px; }
.edu b{ font-size:10.2px; } .edu i{ color:var(--muted); font-style:italic; font-size:9.4px; }
.edu .date{ color:var(--muted); font-size:9.2px; font-weight:600; white-space:nowrap; padding-left:10px; }
</style></head><body>
<div class="band">
  <div><div class="name">${esc(d.name)}</div>
  <div class="role">${esc(d.title)}<small>${esc(d.subtitle)}</small></div></div>
  <div class="contact">
    <div>${esc(c.phone)}</div><div>${esc(c.email)}</div><div>${esc(c.location)}</div>
    <div><a href="${c.linkedinUrl}">${esc(c.linkedin)}</a></div>
    <div><a href="${c.portfolioUrl}">${esc(c.portfolio)}</a></div>
  </div>
</div>
<div class="body">
  <h2>Professional Summary</h2>
  ${d.summary.map((p) => `<p class="summary">${hl(p)}</p>`).join("")}
  <h2>Technical Skills</h2>${skills}
  <h2>Professional Experience</h2><div class="timeline">${jobs}</div>
  <h2>Core Strengths</h2><ul class="strengths">${strengths}</ul>
  <h2>Education</h2>${edu}
</div></body></html>`;
}
