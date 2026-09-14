import { useRef, useState } from "react";
import type { SavedVersion } from "../../types";
import { Button } from "../ui";

const fmt = (ts: number) => { try { return new Date(ts).toLocaleString(); } catch { return ""; } };
const safe = (s: string) => (s || "resume").replace(/[^\w\-]+/g, "_").slice(0, 40);

function download(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function VersionsTab({
  versions, setVersions, defaultName, onSave, onLoad, onTrack,
}: {
  versions: SavedVersion[];
  setVersions: (v: SavedVersion[]) => void;
  defaultName: string;
  onSave: (name: string) => void;
  onLoad: (v: SavedVersion) => void;
  onTrack: (v: SavedVersion) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [seen, setSeen] = useState(defaultName);
  if (defaultName !== seen) { setSeen(defaultName); setName(defaultName); }
  const fileRef = useRef<HTMLInputElement>(null);

  const importFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result));
        const incoming: any[] = Array.isArray(parsed) ? parsed : [parsed];
        const add = incoming
          .filter((v) => v?.data)
          .map((v, i) => ({
            id: `v${Date.now()}_${i}`,
            name: v.name || "Imported",
            savedAt: v.savedAt || Date.now(),
            data: v.data,
            jd: v.jd,
            atsScore: v.atsScore ?? null,
          })) as SavedVersion[];
        setVersions([...add, ...versions]);
      } catch { /* ignore malformed */ }
    };
    r.readAsText(f);
  };

  return (
    <>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <b>Saved Versions</b>
        <span className="muted">{versions.length} saved</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          style={{ flex: 1, minWidth: 190 }} value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Version name (role / company)"
        />
        <Button variant="accent" size="sm" onClick={() => onSave(name.trim() || defaultName)}>
          💾 Save current resume
        </Button>
      </div>

      {versions.length === 0 ? (
        <div className="empty">
          No saved versions yet. Tailor a resume, then save it here — it's named after the role automatically.
        </div>
      ) : (
        <div className="list">
          {versions.map((v) => (
            <div key={v.id} className="item">
              <div className="grow">
                <div className="name">{v.name}</div>
                <div className="meta">
                  Saved {fmt(v.savedAt)}
                  {v.atsScore != null && <> · ATS {v.atsScore}/100</>}
                </div>
              </div>
              <div className="acts">
                <Button size="sm" variant="accent" onClick={() => onLoad(v)}>↥ Load</Button>
                <Button size="sm" variant="ghost" onClick={() => onTrack(v)}>📌 Track</Button>
                <Button size="sm" variant="ghost"
                  onClick={() => download(`resume-version-${safe(v.name)}.json`, v)}>⬇</Button>
                <Button size="sm" variant="ghost"
                  onClick={() => {
                    const n = prompt("Rename version:", v.name);
                    if (n === null) return;
                    setVersions(versions.map((x) => (x.id === v.id ? { ...x, name: n.trim() || x.name } : x)));
                  }}>✎</Button>
                <Button size="sm" variant="ghost"
                  onClick={() => {
                    if (!confirm(`Delete "${v.name}"? This cannot be undone.`)) return;
                    setVersions(versions.filter((x) => x.id !== v.id));
                  }}>🗑</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Button size="sm" variant="ghost"
          onClick={() => versions.length && download("resume-versions-all.json", versions)}>
          ⬇ Export all (backup)
        </Button>
        <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>📥 Import .json</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden
          onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        <span className="muted">
          Versions live in this browser. Export a <b>.json</b> for a permanent, portable backup.
        </span>
      </div>
    </>
  );
}
