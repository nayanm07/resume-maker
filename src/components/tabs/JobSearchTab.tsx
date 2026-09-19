import { useMemo, useState } from "react";
import type { Profile, Resume } from "../../types";
import { Button, CopyButton } from "../ui";
import {
  buildLinks, defaultLocation, parseYears, postQueryText, suggestRoles, suggestSkills, uniq,
  type Freshness, type JobPrefs,
} from "../../lib/jobSearch";

const FRESHNESS: { v: Freshness; label: string }[] = [
  { v: 1, label: "Last 24 hours" },
  { v: 3, label: "Last 3 days" },
  { v: 7, label: "Last 7 days" },
];

/**
 * Builds searches from the resume and opens each platform's own search page,
 * newest first. No scraping and no API keys — results are always live and
 * open in the user's own (logged-in) browser.
 */
export function JobSearchTab({
  base, profile, prefs, setPrefs, useProfileRoles, suggesting, onSuggest, onUseRole,
}: {
  base: Resume;
  profile: Profile;
  prefs: JobPrefs;
  setPrefs: (p: JobPrefs) => void;
  /** false when My Details still holds the built-in sample roles */
  useProfileRoles: boolean;
  suggesting: boolean;
  onSuggest: () => void;
  /** set a role as the Target role so the resume is positioned and named for it */
  onUseRole: (role: string) => void;
}) {
  const [newRole, setNewRole] = useState("");

  const roles = useMemo(
    () => uniq([...suggestRoles(base, profile, prefs.aiRoles ?? [], useProfileRoles), ...prefs.customRoles]),
    [base, profile, prefs.aiRoles, prefs.customRoles, useProfileRoles]
  );
  const picked = (prefs.picked ?? roles.slice(0, 3)).filter((r) => roles.some((x) => x.toLowerCase() === r.toLowerCase()));
  const skillOptions = useMemo(() => uniq([...(prefs.aiSkills ?? []), ...suggestSkills(base)]).slice(0, 18), [base, prefs.aiSkills]);
  const location = prefs.location || defaultLocation(base);
  const years = prefs.years ?? parseYears(profile.exp);
  const set = (patch: Partial<JobPrefs>) => setPrefs({ ...prefs, ...patch });

  const toggleRole = (r: string) =>
    set({ picked: picked.includes(r) ? picked.filter((x) => x !== r) : [...picked, r] });
  const toggleSkill = (s: string) => {
    if (prefs.skills.includes(s)) set({ skills: prefs.skills.filter((x) => x !== s) });
    else if (prefs.skills.length < 3) set({ skills: [...prefs.skills, s] });
  };
  const addRole = () => {
    const v = newRole.trim();
    if (!v) return;
    set({ customRoles: uniq([...prefs.customRoles, v]), picked: uniq([...picked, v]) });
    setNewRole("");
  };

  const opts = { location, remote: prefs.remote, years, days: prefs.days, skills: prefs.skills };
  const place = prefs.remote ? "remote" : location;

  return (
    <>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <b>Find Jobs</b>
        <Button size="sm" variant="ghost" busy={suggesting} onClick={onSuggest}>
          {suggesting ? "Thinking…" : "✨ Suggest roles with AI"}
        </Button>
      </div>
      <div className="muted" style={{ marginBottom: 14 }}>
        Searches are built from your resume and open each site's own search, <b>newest first</b> — always
        live, no scraping. Stay logged in to LinkedIn and Naukri for the best results.
      </div>

      {/* ---------- roles ---------- */}
      <div className="sec">
        <h3>1 · Roles to search <span className="muted" style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— from your resume; tap to select</span></h3>
        <div>
          {roles.map((r) => (
            <button
              key={r} type="button"
              className={`chip pick ${picked.includes(r) ? "ok" : "neutral"}`}
              onClick={() => toggleRole(r)}
            >
              {picked.includes(r) ? "✓ " : ""}{r}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={newRole} onChange={(e) => setNewRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRole()}
            placeholder="Add a role, e.g. Software Engineer"
          />
          <Button size="sm" variant="ghost" onClick={addRole}>+ Add</Button>
        </div>
      </div>

      {/* ---------- filters ---------- */}
      <div className="sec">
        <h3>2 · Filters</h3>
        <div className="jobfilters">
          <div>
            <label className="lbl">Location</label>
            <input
              list="job-locations" value={location}
              onChange={(e) => set({ location: e.target.value })}
            />
            <datalist id="job-locations">
              <option value={defaultLocation(base)} />
              <option value="India" />
              <option value="Bengaluru" />
              <option value="Pune" />
              <option value="Hyderabad" />
              <option value="Gurugram" />
              <option value="Ahmedabad" />
            </datalist>
          </div>
          <div>
            <label className="lbl">Experience (years)</label>
            <input
              type="number" min={0} max={30} value={years}
              onChange={(e) => set({ years: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
          <div>
            <label className="lbl">Posted within</label>
            <select value={prefs.days} onChange={(e) => set({ days: Number(e.target.value) as Freshness })}>
              {FRESHNESS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
            </select>
          </div>
          <label className="check" style={{ alignSelf: "end", margin: 0 }}>
            <input type="checkbox" checked={prefs.remote} onChange={(e) => set({ remote: e.target.checked })} />
            <span className="grow">Remote only</span>
          </label>
        </div>

        <label className="lbl">Extra keywords for hiring-post searches <span className="muted">(optional, up to 3)</span></label>
        <div>
          {skillOptions.map((s) => (
            <button
              key={s} type="button"
              className={`chip pick ${prefs.skills.includes(s) ? "ok" : "neutral"}`}
              onClick={() => toggleSkill(s)}
            >
              {prefs.skills.includes(s) ? "✓ " : ""}{s}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- results ---------- */}
      <div className="sec">
        <h3>3 · Open the latest jobs &amp; hiring posts</h3>
        {picked.length === 0 && <div className="muted">Select at least one role above.</div>}

        {picked.map((role) => {
          const links = buildLinks(role, opts);
          const boards = links.filter((l) => l.group === "jobs");
          const posts = links.filter((l) => l.group === "posts");
          return (
            <div key={role} className="jobcard">
              <div className="row-between" style={{ marginBottom: 8 }}>
                <b style={{ fontSize: 14 }}>{role}</b>
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Button size="sm" variant="ghost" onClick={() => onUseRole(role)}>🎯 Set as target role</Button>
                  <Button
                    size="sm" variant="accent"
                    onClick={() => boards.forEach((l) => window.open(l.url, "_blank", "noopener"))}
                    title="If only one tab opens, allow pop-ups for this site"
                  >
                    ↗ Open all job boards
                  </Button>
                </span>
              </div>

              <div className="linkrow">
                <span className="linklabel">Job boards</span>
                {boards.map((l) => (
                  <a key={l.id} className="btn sm ghost" href={l.url} target="_blank" rel="noopener noreferrer" title={l.hint}>
                    {l.platform}{l.hint ? <span className="linkhint"> · {l.hint}</span> : null}
                  </a>
                ))}
              </div>
              <div className="linkrow">
                <span className="linklabel">Hiring posts</span>
                {posts.map((l) => (
                  <a key={l.id} className="btn sm ghost" href={l.url} target="_blank" rel="noopener noreferrer" title={l.hint}>
                    {l.platform}{l.hint ? <span className="linkhint"> · {l.hint}</span> : null}
                  </a>
                ))}
              </div>
              <div className="querybox">
                <code>{postQueryText(role, place, prefs.skills)}</code>
                <CopyButton text={postQueryText(role, place, prefs.skills)} label="Copy query" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="hint">
        💡 Found a good one? Paste its description into <b>Job Description</b> on the left → <b>Analyze</b> →
        <b> Generate</b> → <b>💾 Save version</b> → <b>📌 Track</b>. If “Open all” opens only one tab,
        allow pop-ups for this site in your browser.
      </div>
    </>
  );
}
