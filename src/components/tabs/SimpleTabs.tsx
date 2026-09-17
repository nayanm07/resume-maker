import { useState } from "react";
import type { AtsReport, CoverEmail, DiffEntryView, RelevantProject } from "./tabTypes";
import { Button, CopyButton } from "../ui";

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
