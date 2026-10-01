import { useRef, useState } from "react";
import type { AtsReport, CoverEmail, DiffEntryView, RelevantProject, Resume } from "./tabTypes";
import { Button, CopyButton } from "../ui";
import { titleCase } from "../../lib/resume";

/* ---------------- ATS ---------------- */
export function AtsTab({ report }: { report: AtsReport | null }) {
  if (!report) return <div className="empty">Generate with <b>ATS Report</b> ticked to see your match score.</div>;
  const s = Math.max(0, Math.min(100, report.matchScore ?? 0));
  const color = s >= 75 ? "var(--ok)" : s >= 50 ? "var(--warn)" : "var(--bad)";
  return (
    <>
      <div className="score">
        <div className="ring" style={{ background: color }}>{s}</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>ATS Match Score</div>
          <div className="muted">Estimated fit of the tailored resume to this job description.</div>
        </div>
      </div>
      <div className="sec">
        <h3>✅ Matched keywords</h3>
        <div>{report.matchedKeywords?.length
          ? report.matchedKeywords.map((k) => <span key={k} className="chip ok">{k}</span>)
          : <span className="muted">—</span>}</div>
      </div>
      <div className="sec">
        <h3>⚠️ Still missing / weak</h3>
        <div>{report.missingKeywords?.length
          ? report.missingKeywords.map((k) => <span key={k} className="chip bad">{k}</span>)
          : <span className="muted">None 🎉</span>}</div>
      </div>
      <div className="sec">
        <h3>💡 Suggestions</h3>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {report.suggestions?.map((x, i) => <li key={i} style={{ marginBottom: 6, fontSize: 13 }}>{x}</li>)}
        </ul>
      </div>
    </>
  );
}

/* ---------------- Cover email ---------------- */
export function EmailTab({
  email, projects, recruiterEmails = [], onQuickApply,
}: {
  email: CoverEmail | null;
  projects?: RelevantProject[];
  /** addresses found in the pasted JD */
  recruiterEmails?: string[];
  /** opens a Gmail draft; receives the subject/body as currently edited */
  onQuickApply?: (to: string, subject: string, body: string) => void;
}) {
  const [subject, setSubject] = useState(email?.subject ?? "");
  const [body, setBody] = useState(email?.body ?? "");
  // keep local state in sync when a new email arrives
  const key = (email?.subject ?? "") + (email?.body ?? "").length;
  const [seen, setSeen] = useState(key);
  if (key !== seen) { setSeen(key); setSubject(email?.subject ?? ""); setBody(email?.body ?? ""); }

  if (!email) return <div className="empty">Generate with <b>Cover Email</b> ticked to draft an email.</div>;

  const mailto = `mailto:${recruiterEmails[0] ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <b>Cover Email</b>
        <span style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {onQuickApply && recruiterEmails.slice(0, 3).map((to) => (
            <Button key={to} size="sm" variant="accent" onClick={() => onQuickApply(to, subject, body)}>
              ✉️ Send via Gmail → {to}
            </Button>
          ))}
          {onQuickApply && recruiterEmails.length === 0 && (
            <Button
              size="sm" variant="ghost"
              onClick={() => {
                const to = prompt("No recruiter email was found in the job description. Enter one:");
                if (to?.trim()) onQuickApply(to.trim(), subject, body);
              }}
            >
              ✉️ Open in Gmail
            </Button>
          )}
          <a className="btn sm ghost" href={mailto}>📧 Mail app</a>
          <CopyButton text={`Subject: ${subject}\n\n${body}`} label="Copy all" />
        </span>
      </div>
      {!!projects?.length && (
        <div className="sec">
          <h3>🎯 Projects the AI matched to this JD</h3>
          {projects.map((p, i) => (
            <div key={i} className="diff changed" style={{ marginBottom: 8 }}>
              <div className="where">{p.name}</div>
              <div className="after"><b>Why:</b> {p.match}</div>
              <div className="after" style={{ marginTop: 4 }}><b>Metric:</b> {p.highlight}</div>
            </div>
          ))}
        </div>
      )}
      <label className="lbl">Subject</label>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} />
      <label className="lbl">Body</label>
      <textarea value={body} rows={16} onChange={(e) => setBody(e.target.value)} />
    </>
  );
}

/* ---------------- Cover letter ---------------- */
const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A4 business letter: letterhead from the resume's contact block, today's
 *  date, the AI's paragraphs, then the sign-off. The AI writes only the middle. */
function letterHtml(body: string, r: Resume, date: string): string {
  const c = r.contact;
  const name = titleCase(r.name);
  const paras = body
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(name)}</title><style>
@page{ size:A4; margin:20mm 22mm; }
html,body{ background:#fff; }
body{ font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; color:#1f2630; font-size:11pt; line-height:1.6; }
.head{ border-bottom:2px solid #012E58; padding-bottom:10px; margin-bottom:22px; }
.head .n{ font-size:20pt; font-weight:300; letter-spacing:2px; color:#012E58; }
.head .c{ font-size:9pt; color:#5c6672; margin-top:6px; }
.date{ color:#5c6672; font-size:10pt; margin-bottom:20px; }
p{ margin:0 0 12px; text-align:justify; }
.sign{ margin-top:22px; }
.sign .nm{ font-weight:700; margin-top:26px; }
.sign .ct{ color:#5c6672; font-size:9.5pt; }
</style></head><body>
<div class="head">
  <div class="n">${escHtml(name.toUpperCase())}</div>
  <div class="c">${escHtml(c.phone)} &nbsp;·&nbsp; ${escHtml(c.email)} &nbsp;·&nbsp; ${escHtml(c.location)}<br>${escHtml(c.linkedin)} &nbsp;·&nbsp; ${escHtml(c.portfolio)}</div>
</div>
<div class="date">${escHtml(date)}</div>
${paras}
<div class="sign">Sincerely,<div class="nm">${escHtml(name)}</div><div class="ct">${escHtml(c.phone)} · ${escHtml(c.email)}</div></div>
</body></html>`;
}

export function CoverLetterTab({
  letter, resume, target,
}: { letter: string; resume: Resume; target?: string }) {
  const [val, setVal] = useState(letter);
  const [seen, setSeen] = useState(letter);
  // keep the editable copy in sync when a new letter is generated
  if (letter !== seen) { setSeen(letter); setVal(letter); }
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  if (!letter)
    return (
      <div className="empty">
        Generate with <b>Cover Letter</b> ticked to draft a formal letter you can attach as a PDF.
      </div>
    );

  const name = titleCase(resume.name);
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const c = resume.contact;
  /** what "Copy" puts on the clipboard — the whole letter, ready to paste */
  const plain = `${name}\n${c.phone} · ${c.email} · ${c.location}\n${c.linkedin} · ${c.portfolio}\n\n${date}\n\n${val.trim()}\n\nSincerely,\n${name}`;

  const fileName = `${name} - Cover Letter${target?.trim() ? ` - ${target.trim()}` : ""}`
    .replace(/[\\/:*?"<>|#%{}~&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  /* Print from a reusable hidden iframe so the page itself is never replaced.
     Chromium suggests the document title as the "Save as PDF" file name. */
  const print = () => {
    let f = frameRef.current;
    if (!f) {
      f = document.createElement("iframe");
      f.setAttribute("title", "Cover letter print");
      f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
      document.body.appendChild(f);
      frameRef.current = f;
    }
    const d = f.contentDocument;
    const w = f.contentWindow;
    if (!d || !w) return;
    d.open();
    d.write(letterHtml(val, resume, date));
    d.close();
    const prevTitle = document.title;
    document.title = fileName;
    d.title = fileName;
    const restore = () => { document.title = prevTitle; };
    w.addEventListener("afterprint", restore, { once: true });
    // let the iframe lay out before the dialog opens
    setTimeout(() => { w.focus(); w.print(); }, 120);
    setTimeout(restore, 4000);
  };

  return (
    <>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <b>Cover Letter</b>
        <span style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button size="sm" variant="accent" onClick={print} title={`Saves as "${fileName}.pdf"`}>
            ⬇ PDF
          </Button>
          <CopyButton text={plain} label="Copy letter" />
        </span>
      </div>
      <div className="muted" style={{ marginBottom: 10 }}>
        Your letterhead, today's date and the sign-off are added automatically — edit only the
        letter itself below.
      </div>
      <textarea value={val} rows={20} onChange={(e) => setVal(e.target.value)} />
    </>
  );
}

/* ---------------- Generic message tab ---------------- */
export function MessageTab({
  title, text, empty, waLink,
}: { title: string; text: string; empty: string; waLink?: boolean }) {
  const [val, setVal] = useState(text);
  const [seen, setSeen] = useState(text);
  if (text !== seen) { setSeen(text); setVal(text); }

  if (!text) return <div className="empty">{empty}</div>;
  return (
    <>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <b>{title}</b>
        <span style={{ display: "flex", gap: 7 }}>
          {waLink && (
            <a className="btn sm ghost" target="_blank" rel="noreferrer"
               href={`https://wa.me/?text=${encodeURIComponent(val)}`}>📲 Open WhatsApp</a>
          )}
          <CopyButton text={val} />
        </span>
      </div>
      <textarea value={val} rows={10} onChange={(e) => setVal(e.target.value)} />
    </>
  );
}

/* ---------------- Diff ---------------- */
export function DiffTab({ entries }: { entries: DiffEntryView[] }) {
  if (!entries.length)
    return <div className="empty">Generate a tailored resume to see exactly what the AI changed versus your base resume.</div>;
  const added = entries.filter((e) => e.kind === "added").length;
  const changed = entries.filter((e) => e.kind === "changed").length;
  return (
    <>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <b>What the AI changed</b>
        <span>
          <span className="chip ok">{added} added</span>
          <span className="chip neutral">{changed} reworded</span>
        </span>
      </div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Nothing is ever deleted — every original bullet is still in your resume. This shows only
        additions and rewordings so you can sanity-check the AI.
      </div>
      {entries.map((e, i) => (
        <div key={i} className={`diff ${e.kind}`}>
          <div className="where">{e.kind === "added" ? "＋ added" : "✎ reworded"} · {e.where}</div>
          {e.before && <div className="before">{e.before}</div>}
          <div className="after">{e.after}</div>
        </div>
      ))}
    </>
  );
}
