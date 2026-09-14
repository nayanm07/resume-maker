import { useMemo } from "react";
import type { AppStatus, SavedVersion, TrackedApp } from "../../types";
import { Button } from "../ui";

const STATUSES: { id: AppStatus; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
];

const fmt = (ts: number) => { try { return new Date(ts).toLocaleDateString(); } catch { return ""; } };

/** NEW: a lightweight pipeline so every tailored resume turns into a tracked application. */
export function TrackerTab({
  apps, setApps, versions, onLoadVersion,
}: {
  apps: TrackedApp[];
  setApps: (a: TrackedApp[]) => void;
  versions: SavedVersion[];
  onLoadVersion: (v: SavedVersion) => void;
}) {
  const counts = useMemo(() => {
    const c: Record<AppStatus, number> = { saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
    apps.forEach((a) => { c[a.status]++; });
    return c;
  }, [apps]);

  const update = (id: string, patch: Partial<TrackedApp>) =>
    setApps(apps.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a)));

  const add = () =>
    setApps([
      { id: `a${Date.now()}`, company: "", role: "", status: "saved", createdAt: Date.now(), updatedAt: Date.now() },
      ...apps,
    ]);

  return (
    <>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <b>Application Tracker</b>
        <Button size="sm" variant="accent" onClick={add}>＋ Add application</Button>
      </div>

      <div style={{ marginBottom: 14 }}>
        {STATUSES.map((s) => (
          <span key={s.id} className={`status-pill st-${s.id}`} style={{ marginRight: 6 }}>
            {s.label}: {counts[s.id]}
          </span>
        ))}
      </div>

      {apps.length === 0 ? (
        <div className="empty">
          No applications tracked yet. Save a resume version and hit <b>📌 Track</b>, or add one manually.
        </div>
      ) : (
        <div className="list">
          {apps.map((a) => {
            const linked = versions.find((v) => v.id === a.versionId);
            return (
              <div key={a.id} className="item" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                <div className="grow" style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      style={{ flex: "1 1 160px" }} placeholder="Company"
                      value={a.company} onChange={(e) => update(a.id, { company: e.target.value })}
                    />
                    <input
                      style={{ flex: "1 1 200px" }} placeholder="Role"
                      value={a.role} onChange={(e) => update(a.id, { role: e.target.value })}
                    />
                    <select
                      style={{ flex: "0 0 130px" }} value={a.status}
                      onChange={(e) => update(a.id, { status: e.target.value as AppStatus })}
                    >
                      {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <input
                    placeholder="Notes — recruiter name, next step, interview date…"
                    value={a.notes ?? ""} onChange={(e) => update(a.id, { notes: e.target.value })}
                  />
                  <div className="meta">
                    <span className={`status-pill st-${a.status}`}>{a.status}</span>{" "}
                    added {fmt(a.createdAt)}
                    {a.atsScore != null && <> · ATS {a.atsScore}/100</>}
                    {linked && <> · resume: <b>{linked.name}</b></>}
                  </div>
                </div>
                <div className="acts">
                  {linked && (
                    <Button size="sm" variant="ghost" onClick={() => onLoadVersion(linked)}>↥ Open resume</Button>
                  )}
                  <Button size="sm" variant="ghost"
                    onClick={() => { if (confirm("Remove this application?")) setApps(apps.filter((x) => x.id !== a.id)); }}>
                    🗑
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
