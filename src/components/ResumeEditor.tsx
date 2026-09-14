import { useCallback } from "react";
import type { Resume } from "../types";
import { Button } from "./ui";
import { clone } from "../lib/resume";

const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

function TextField({
  label, value, onChange, multiline, rows,
}: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; rows?: number;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label className="lbl">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          rows={rows ?? Math.min(12, Math.max(2, value.split("\n").length))}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

/**
 * Fully controlled editor — every keystroke lifts state, so the preview
 * beside it updates live. No debounce needed: React re-renders the iframe
 * srcDoc only when the resume object actually changes.
 */
export function ResumeEditor({
  value, onChange, onDone, onCancel, onRevertSection,
}: {
  value: Resume;
  onChange: (r: Resume) => void;
  onDone: () => void;
  onCancel: () => void;
  onRevertSection: (section: "summary" | "skills" | "experience" | "strengths") => void;
}) {
  const patch = useCallback(
    (fn: (draft: Resume) => void) => {
      const next = clone(value);
      fn(next);
      onChange(next);
    },
    [value, onChange]
  );

  return (
    <div className="editor">
      <div className="editor-actions">
        <Button size="sm" variant="accent" onClick={onDone}>✓ Done</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>✕ Cancel changes</Button>
        <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className="live-dot" /> Live — preview updates as you type
        </span>
      </div>

      {/* Header */}
      <div className="sec">
        <h3>Header</h3>
        <TextField label="Name" value={value.name} onChange={(v) => patch((d) => { d.name = v; })} />
        <TextField label="Title" value={value.title} onChange={(v) => patch((d) => { d.title = v; })} />
        <TextField label="Subtitle" value={value.subtitle} onChange={(v) => patch((d) => { d.subtitle = v; })} />
      </div>

      {/* Contact */}
      <div className="sec">
        <h3>Contact</h3>
        <TextField label="Phone" value={value.contact.phone} onChange={(v) => patch((d) => { d.contact.phone = v; })} />
        <TextField label="Email" value={value.contact.email} onChange={(v) => patch((d) => { d.contact.email = v; })} />
        <TextField label="Location" value={value.contact.location} onChange={(v) => patch((d) => { d.contact.location = v; })} />
        <TextField label="LinkedIn (shown text)" value={value.contact.linkedin} onChange={(v) => patch((d) => { d.contact.linkedin = v; })} />
        <TextField label="Portfolio (shown text)" value={value.contact.portfolio} onChange={(v) => patch((d) => { d.contact.portfolio = v; })} />
      </div>

      {/* Summary */}
      <div className="sec">
        <h3>
          Professional Summary
          <Button size="sm" variant="ghost" style={{ marginLeft: "auto" }} onClick={() => onRevertSection("summary")}>↺ Base</Button>
        </h3>
        {value.summary.map((p, i) => (
          <div key={i} className="ed-block">
            <TextField
              label={`Paragraph ${i + 1}`} value={p} multiline
              onChange={(v) => patch((d) => { d.summary[i] = v; })}
            />
            {value.summary.length > 1 && (
              <Button size="sm" variant="ghost" onClick={() => patch((d) => { d.summary.splice(i, 1); })}>
                ✕ Remove paragraph
              </Button>
            )}
          </div>
        ))}
        <Button size="sm" variant="ghost" style={{ marginTop: 8 }} onClick={() => patch((d) => { d.summary.push(""); })}>
          + Add paragraph
        </Button>
      </div>

      {/* Skills */}
      <div className="sec">
        <h3>
          Technical Skills
          <Button size="sm" variant="ghost" style={{ marginLeft: "auto" }} onClick={() => onRevertSection("skills")}>↺ Base</Button>
        </h3>
        {value.skills.map((cat, i) => (
          <div key={i} className="ed-block">
            <TextField label="Category name" value={cat.label} onChange={(v) => patch((d) => { d.skills[i].label = v; })} />
            <TextField
              label="Skills (one per line)" value={cat.items.join("\n")} multiline
              onChange={(v) => patch((d) => { d.skills[i].items = lines(v); })}
            />
            <Button size="sm" variant="ghost" onClick={() => patch((d) => { d.skills.splice(i, 1); })}>
              ✕ Remove category
            </Button>
          </div>
        ))}
        <Button size="sm" variant="ghost" style={{ marginTop: 8 }}
          onClick={() => patch((d) => { d.skills.push({ label: "New Category", items: [] }); })}>
          + Add category
        </Button>
      </div>

      {/* Experience */}
      <div className="sec">
        <h3>
          Professional Experience
          <Button size="sm" variant="ghost" style={{ marginLeft: "auto" }} onClick={() => onRevertSection("experience")}>↺ Base</Button>
        </h3>
        {value.experience.map((job, ji) => (
          <div key={ji} className="ed-block">
            <TextField label="Company" value={job.company} onChange={(v) => patch((d) => { d.experience[ji].company = v; })} />
            <TextField label="Role" value={job.role} onChange={(v) => patch((d) => { d.experience[ji].role = v; })} />
            <TextField label="Date" value={job.date} onChange={(v) => patch((d) => { d.experience[ji].date = v; })} />
            {job.place !== undefined && (
              <TextField label="Place / subtitle" value={job.place} onChange={(v) => patch((d) => { d.experience[ji].place = v; })} />
            )}

            {job.groups?.map((g, gi) => (
              <div key={gi} className="ed-ind">
                <TextField label="Track heading" value={g.track}
                  onChange={(v) => patch((d) => { d.experience[ji].groups![gi].track = v; })} />
                {g.projects.map((p, pi) => (
                  <div key={pi}>
                    <TextField label="Project title" value={p.title}
                      onChange={(v) => patch((d) => { d.experience[ji].groups![gi].projects[pi].title = v; })} />
                    <TextField label="Project meta" value={p.meta ?? ""}
                      onChange={(v) => patch((d) => { d.experience[ji].groups![gi].projects[pi].meta = v; })} />
                    <TextField label="Bullets (one per line)" value={p.bullets.join("\n")} multiline
                      onChange={(v) => patch((d) => { d.experience[ji].groups![gi].projects[pi].bullets = lines(v); })} />
                  </div>
                ))}
              </div>
            ))}

            {job.bullets && (
              <TextField label="Bullets (one per line)" value={job.bullets.join("\n")} multiline
                onChange={(v) => patch((d) => { d.experience[ji].bullets = lines(v); })} />
            )}
          </div>
        ))}
      </div>

      {/* Core strengths */}
      <div className="sec">
        <h3>
          Core Strengths
          <Button size="sm" variant="ghost" style={{ marginLeft: "auto" }} onClick={() => onRevertSection("strengths")}>↺ Base</Button>
        </h3>
        <TextField label="One per line" value={value.coreStrengths.join("\n")} multiline
          onChange={(v) => patch((d) => { d.coreStrengths = lines(v); })} />
      </div>

      {/* Education */}
      <div className="sec">
        <h3>Education</h3>
        {value.education.map((e, i) => (
          <div key={i} className="ed-block">
            <TextField label={`Degree ${i + 1}`} value={e.deg} onChange={(v) => patch((d) => { d.education[i].deg = v; })} />
            <TextField label={`Institute ${i + 1}`} value={e.inst} onChange={(v) => patch((d) => { d.education[i].inst = v; })} />
            <TextField label={`Date ${i + 1}`} value={e.date} onChange={(v) => patch((d) => { d.education[i].date = v; })} />
          </div>
        ))}
      </div>
    </div>
  );
}
