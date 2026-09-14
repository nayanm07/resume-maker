import { useState } from "react";
import type {
  GapResult, MissingSkill, OutputKey, SectionKey, SectionLocks, WantMap,
} from "../../types";
import { Button } from "../ui";
import { guessCategory } from "../../lib/resume";

const WANT_LABELS: { key: OutputKey; label: string }[] = [
  { key: "resume", label: "📄 Resume" },
  { key: "ats", label: "✅ ATS Report" },
  { key: "email", label: "✉️ Cover Email" },
  { key: "whatsapp", label: "💬 WhatsApp" },
  { key: "dm", label: "📩 LinkedIn DM" },
  { key: "comment", label: "💡 LinkedIn Comment" },
  { key: "qa", label: "🤖 Application Q&A" },
];

const SECTION_LABELS: { key: SectionKey; label: string; note: string }[] = [
  { key: "summary", label: "Professional Summary", note: "rewritten to mirror the JD" },
  { key: "skills", label: "Technical Skills", note: "ticked skills get added here" },
  { key: "experience", label: "Experience bullets", note: "reordered / reworded — never deleted" },
  { key: "strengths", label: "Core Strengths", note: "reordered / reworded" },
  { key: "headline", label: "Title & subtitle", note: "your headline under your name" },
];

export function SkillGapTab({
  gap, categories, targets, picked, setPicked, want, setWant,
  locks, setLocks, generating, onGenerate,
}: {
  gap: GapResult | null;
  categories: string[];
  targets: string[];
  picked: Record<string, MissingSkill | undefined>;
  setPicked: (p: Record<string, MissingSkill | undefined>) => void;
  want: WantMap;
  setWant: (w: WantMap) => void;
  locks: SectionLocks;
  setLocks: (l: SectionLocks) => void;
  generating: boolean;
  onGenerate: () => void;
}) {
  const [custom, setCustom] = useState("");
  const [extra, setExtra] = useState<MissingSkill[]>([]);

  if (!gap) {
    return (
      <div className="empty">
        Paste a job description on the left and click <b>🔍 Analyze JD</b> to see which required
        skills you already have and which are missing.
      </div>
    );
  }

  const all = [...gap.missing, ...extra];
  const patch = (skill: string, p: Partial<MissingSkill>) => {
    const base = picked[skill] ?? all.find((x) => x.skill === skill)!;
    setPicked({ ...picked, [skill]: { ...base, ...p } });
    setExtra((e) => e.map((x) => (x.skill === skill ? { ...x, ...p } : x)));
    const i = gap.missing.findIndex((x) => x.skill === skill);
    if (i >= 0) gap.missing[i] = { ...gap.missing[i], ...p };
  };

  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    const m: MissingSkill = { skill: v, category: guessCategory(v) };
    setExtra((e) => [...e, m]);
    setPicked({ ...picked, [v]: m });
    setCustom("");
  };

  const chosen = Object.values(picked).filter(Boolean) as MissingSkill[];
  const wantCount = (Object.keys(want) as OutputKey[]).filter((k) => want[k]).length;
  const wovenCount = chosen.filter((c) => c.usedIn).length;

  return (
    <>
      {gap.roleSummary && (
        <div className="chip neutral" style={{ marginBottom: 14, display: "block", padding: "9px 12px", borderRadius: 9 }}>
          🎯 <b>Role:</b> {gap.roleSummary}
        </div>
      )}

      <div className="sec">
        <h3>✅ Skills you already have that this JD wants</h3>
        <div>
          {gap.matched.length
            ? gap.matched.map((k) => <span key={k} className="chip ok">{k}</span>)
            : <span className="muted">—</span>}
        </div>
      </div>

      <div className="sec">
        <h3>➕ Missing skills — tick only the ones you actually have</h3>
        <div className="muted" style={{ marginBottom: 9 }}>
          Auto-sorted into the best category. Pick <b>“used in”</b> to have the AI weave that skill
          into that project's bullets as well — leave it as <i>Skills list only</i> to just list it.
        </div>

        {all.length === 0 && (
          <div className="muted">No missing skills — your resume already covers this JD. 🎉</div>
        )}

        {all.map((m) => {
          const on = !!picked[m.skill];
          const cur = picked[m.skill] ?? m;
          return (
            <div key={m.skill} className="check" style={{ flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="checkbox" checked={on}
                onChange={(e) =>
                  setPicked({ ...picked, [m.skill]: e.target.checked ? cur : undefined })
                }
              />
              <span className="grow">{m.skill}</span>
              <select value={cur.category} onChange={(e) => patch(m.skill, { category: e.target.value })}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              {on && (
                <select
                  style={{ flex: "1 1 220px", minWidth: 180 }}
                  value={cur.usedIn ?? ""}
                  onChange={(e) => patch(m.skill, { usedIn: e.target.value || undefined })}
                >
                  <option value="">— Skills list only —</option>
                  {targets.map((t) => <option key={t} value={t}>used in: {t}</option>)}
                </select>
              )}
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={custom} onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder="Add another skill you have (optional)"
          />
          <Button size="sm" variant="ghost" onClick={addCustom}>+ Add</Button>
        </div>
      </div>

      <div className="sec">
        <h3>
          🔒 What may the AI edit?
          <span className="muted" style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
            — unticked sections are returned exactly as your base resume
          </span>
        </h3>
        <div className="wantgrid">
          {SECTION_LABELS.map(({ key, label, note }) => (
            <label key={key} className="check">
              <input
                type="checkbox" checked={locks[key]}
                onChange={(e) => setLocks({ ...locks, [key]: e.target.checked })}
              />
              <span className="grow">
                {label}
                <div className="muted" style={{ fontSize: 11 }}>{note}</div>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="sec">
        <h3>
          ⚙️ What to generate
          <span className="muted" style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
            — pick fewer for less token usage (remembered)
          </span>
        </h3>
        <div className="wantgrid">
          {WANT_LABELS.map(({ key, label }) => (
            <label key={key} className="check">
              <input
                type="checkbox" checked={want[key]}
                onChange={(e) => setWant({ ...want, [key]: e.target.checked })}
              />
              <span className="grow">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <Button variant="accent" block busy={generating} onClick={onGenerate}>
        {generating ? "Generating…" : `✨ Generate Selected (${wantCount})`}
      </Button>
      <div className="hint">
        ✔ Nothing is ever deleted from your experience. Adding {chosen.length} skill
        {chosen.length === 1 ? "" : "s"}
        {wovenCount > 0 && <> — {wovenCount} woven into project bullets</>}.
      </div>
    </>
  );
}
