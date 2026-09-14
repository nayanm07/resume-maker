import { useRef, useState } from "react";
import type { Resume } from "../../types";
import { Button } from "../ui";
import { ACCEPTED, EMPTY_RESUME, resumeStats } from "../../lib/resumeImport";
import { ResumeEditor } from "../ResumeEditor";
import { ResumePreview } from "../ResumePreview";

function download(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MyResumeTab({
  base, setBase, isOwn, parsing, onImportFile, onParseText, onError,
}: {
  base: Resume;
  setBase: (r: Resume) => void;
  /** false while the built-in sample resume is still in place */
  isOwn: boolean;
  parsing: boolean;
  onImportFile: (f: File) => void;
  onParseText: (text: string) => void;
  onError: (msg: string) => void;
}) {
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const stats = resumeStats(base);

  const importJson = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result));
        setBase(parsed?.data ?? parsed);
      } catch (e: any) {
        onError(`That file isn't valid resume JSON: ${e.message}`);
      }
    };
    r.readAsText(f);
  };

  return (
    <>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <b>My Resume</b>
        <span className="muted">
          {isOwn
            ? `${stats.jobs} jobs · ${stats.bullets} bullets · ${stats.skills} skills`
            : "sample resume loaded"}
        </span>
      </div>

      {!isOwn && (
        <div className="chip neutral" style={{ display: "block", padding: "10px 13px", borderRadius: 9, marginBottom: 14 }}>
          👋 <b>Start here.</b> This is a sample resume. Add yours below — everything the app
          generates is built from it, and it stays in your browser only.
        </div>
      )}

      <div className="sec">
        <h3>1 · Upload your resume</h3>
        <div className="muted" style={{ marginBottom: 9 }}>
          PDF or plain text. The AI reads it and fills in the structure below — it copies your real
          wording and never invents anything. <b>Requires an API key</b> (left panel).
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="accent" busy={parsing} onClick={() => fileRef.current?.click()}>
            📄 Upload PDF / TXT
          </Button>
          <input
            ref={fileRef} type="file" accept={ACCEPTED} hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = ""; }}
          />
          <Button variant="ghost" onClick={() => jsonRef.current?.click()}>📥 Import resume .json</Button>
          <input
            ref={jsonRef} type="file" accept="application/json,.json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }}
          />
          <Button variant="ghost" onClick={() => download("my-resume.json", base)}>⬇ Export .json</Button>
        </div>
        <div className="hint">
          Word file? Open it and “Save as PDF” first, or paste the text below.
        </div>
      </div>

      <div className="sec">
        <h3>2 · …or paste your resume text</h3>
        <textarea
          rows={7} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Paste the whole resume here — name, contact, summary, skills, every job and bullet, education…"
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <Button
            variant="accent" busy={parsing}
            onClick={() => {
              if (text.trim().length < 80) return onError("Paste a bit more of your resume first.");
              onParseText(text.trim());
            }}
          >
            ✨ Convert to structured resume
          </Button>
          <Button variant="ghost" onClick={() => { setBase(EMPTY_RESUME); setEditing(true); }}>
            ✍️ Start from a blank template
          </Button>
        </div>
      </div>

      <div className="sec">
        <h3>3 · Review &amp; edit</h3>
        <div className="muted" style={{ marginBottom: 9 }}>
          Always check the parsed result — fix anything the AI misread. This is your master copy;
          every tailored version is generated from it.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <Button variant={editing ? "ghost" : "accent"} onClick={() => setEditing((v) => !v)}>
            {editing ? "✕ Close editor" : "✏️ Edit my resume"}
          </Button>
        </div>

        <div className={`stage ${editing ? "editing" : ""}`}>
          {editing && (
            <ResumeEditor
              value={base}
              onChange={setBase}
              onDone={() => setEditing(false)}
              onCancel={() => setEditing(false)}
              onRevertSection={() => onError("Revert isn't available for your master resume — it is the source.")}
            />
          )}
          <ResumePreview resume={base} />
        </div>
      </div>
    </>
  );
}
