import { useState } from "react";
import type { QaItem } from "../../types";
import { Button, CopyButton } from "../ui";

export function QaTab({
  items, predicting, asking, onPredict, onAsk,
}: {
  items: QaItem[];
  predicting: boolean;
  asking: boolean;
  onPredict: () => void;
  onAsk: (q: string) => void;
}) {
  const [q, setQ] = useState("");

  const submit = () => {
    const v = q.trim();
    if (!v) return;
    onAsk(v);
    setQ("");
  };

  return (
    <>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <b>Application Q&amp;A</b>
        <Button variant="accent" size="sm" busy={predicting} onClick={onPredict}>
          {predicting ? "Predicting…" : "🔮 Predict application questions"}
        </Button>
      </div>
      <div className="muted" style={{ marginBottom: 14 }}>
        Generates the screening questions this application is likely to ask, answered from{" "}
        <b>your resume + this JD + My Details</b>. Or ask any question they actually asked, below.
      </div>

      {items.length === 0 && (
        <div className="empty">
          No questions yet — click <b>🔮 Predict application questions</b>, or ask your own below.
        </div>
      )}

      {items.map((it, i) => (
        <div key={i} className={`qa-card ${it.user ? "mine" : ""}`}>
          <div className="qa-q"><span>{it.user ? "🙋" : "❓"}</span><span>{it.q}</span></div>
          <div className="qa-a">{it.a}</div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <CopyButton text={it.a} label="Copy answer" />
          </div>
        </div>
      ))}

      <div className="qa-ask">
        <textarea
          rows={2} value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); }}
          placeholder='Paste any question the application asks — e.g. "Why are you a good fit for this role?" (Ctrl+Enter to send)'
        />
        <Button variant="accent" busy={asking} onClick={submit}>💬 Answer this</Button>
      </div>
    </>
  );
}
