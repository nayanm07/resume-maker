import { useMemo } from "react";
import type { Profile, ProviderId, ProviderStore, RoleFocus, WantMap } from "../types";
import { FOCUS_IDS, FOCUS_LABEL } from "../lib/positioning";
import { PROVIDERS, PROVIDER_IDS } from "../lib/providers";
import { Button, Card, Field } from "./ui";
import { detectEmails } from "../lib/resume";
import { estimateCost, fmtTokens } from "../lib/tokens";

export function Sidebar(props: {
  provider: ProviderId; setProvider: (p: ProviderId) => void;
  store: ProviderStore; setStore: (s: ProviderStore) => void;
  jd: string; setJd: (v: string) => void;
  target: string; setTarget: (v: string) => void;
  tone: string; setTone: (v: string) => void;
  focusPref: RoleFocus | "auto"; setFocusPref: (f: RoleFocus | "auto") => void; detectedFocus: RoleFocus;
  profile: Profile; setProfile: (p: Profile) => void;
  want: WantMap;
  analyzing: boolean;
  onAnalyze: () => void;
  promptChars: number;
  onQuickApply: (email: string) => void;
}) {
  const {
    provider, setProvider, store, setStore, jd, setJd, target, setTarget,
    tone, setTone, focusPref, setFocusPref, detectedFocus, profile, setProfile, want, analyzing, onAnalyze, promptChars, onQuickApply,
  } = props;

  const def = PROVIDERS[provider];
  const cfg = store[provider] ?? { key: "", model: def.models[0] };
  const setCfg = (patch: Partial<{ key: string; model: string }>) =>
    setStore({ ...store, [provider]: { ...cfg, ...patch } });

  const emails = useMemo(() => detectEmails(jd), [jd]);
  const cost = useMemo(
    () => estimateCost(promptChars, want, provider, cfg.model),
    [promptChars, want, provider, cfg.model]
  );

  return (
    <aside className="sidebar">
      {/* ---------- AI config ---------- */}
      <Card title="AI Configuration">
        <div className="seg" style={{ marginBottom: 10 }}>
          {PROVIDER_IDS.map((p) => (
            <button key={p} className={p === provider ? "on" : ""} onClick={() => setProvider(p)}>
              {PROVIDERS[p].label}
            </button>
          ))}
        </div>

        <Field label={`API Key ${cfg.key ? "✓ saved" : "(not set)"}`}>
          <input
            type="password" autoComplete="off" placeholder="Paste your API key"
            value={cfg.key} onChange={(e) => setCfg({ key: e.target.value })}
          />
        </Field>

        <Field label="Model">
          <input
            list={`models-${provider}`} value={cfg.model}
            onChange={(e) => setCfg({ model: e.target.value })} placeholder="model name"
          />
          <datalist id={`models-${provider}`}>
            {def.models.map((m) => <option key={m} value={m} />)}
          </datalist>
        </Field>

        <div className="hint">
          {def.hint} · Key: <a href={`https://${def.keyHome}`} target="_blank" rel="noreferrer">{def.keyHome}</a>
        </div>
        <div className="hint">
          Keys stay in this browser only (localStorage). Nothing is sent anywhere except the provider you pick.
        </div>
      </Card>

      {/* ---------- JD ---------- */}
      <Card title="Job Description" num={1}>
        <Field label="Paste the JD you're applying to">
          <textarea
            rows={9} value={jd} onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description — role, responsibilities, required skills, company…"
          />
        </Field>
        <Field label="Target role / company (optional)">
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. Senior React Native Engineer @ Acme" />
        </Field>
        <Field label="Position resume as">
          <select value={focusPref} onChange={(e) => setFocusPref(e.target.value as RoleFocus | "auto")}>
            <option value="auto">Auto — detected: {FOCUS_LABEL[detectedFocus]}</option>
            {FOCUS_IDS.map((f) => <option key={f} value={f}>{FOCUS_LABEL[f]}</option>)}
          </select>
        </Field>
        <div className="hint">
          Swaps the headline &amp; summary and puts the most relevant skills and projects first, so a
          full-stack role doesn't read as mobile-only. Preview updates instantly — no AI tokens.
        </div>
        <Field label="Tone for outreach messages">
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option>Professional</option>
            <option>Warm &amp; friendly</option>
            <option>Confident &amp; direct</option>
            <option>Enthusiastic</option>
          </select>
        </Field>

        <Button variant="accent" block busy={analyzing} onClick={onAnalyze} style={{ marginTop: 12 }}>
          {analyzing ? "Analyzing…" : "🔍 Analyze JD & Find Skill Gaps"}
        </Button>

        <div className="costbar">
          <span>≈ <b>{fmtTokens(cost.totalTokens)}</b> tokens next run</span>
          <span>·</span>
          <span>{cost.free ? <b style={{ color: "var(--ok)" }}>free tier</b> : <>≈ <b>${cost.usd?.toFixed(4)}</b></>}</span>
          <span style={{ marginLeft: "auto" }}>{fmtTokens(cost.inputTokens)} in / {fmtTokens(cost.outputTokens)} out</span>
        </div>

        {emails.length > 0 && (
          <div className="hint" style={{ marginTop: 10 }}>
            <b>📧 Recruiter email found:</b>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {emails.slice(0, 3).map((e) => (
                <Button key={e} size="sm" variant="ghost" onClick={() => onQuickApply(e)}>
                  ✉️ Quick apply → {e}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ---------- My details ---------- */}
      <Card title="My Details">
        <div className="muted" style={{ marginBottom: 8 }}>
          Used for the Quick Apply email and factual Q&amp;A answers (notice period, CTC).
        </div>
        <div className="grid2">
          <div>
            <Field label="Experience">
              <input value={profile.exp} onChange={(e) => setProfile({ ...profile, exp: e.target.value })} />
            </Field>
          </div>
          <div>
            <Field label="Notice period">
              <input value={profile.notice} onChange={(e) => setProfile({ ...profile, notice: e.target.value })} />
            </Field>
          </div>
          <div>
            <Field label="Current CTC">
              <input value={profile.current} onChange={(e) => setProfile({ ...profile, current: e.target.value })} />
            </Field>
          </div>
          <div>
            <Field label="Expected CTC">
              <input value={profile.expected} onChange={(e) => setProfile({ ...profile, expected: e.target.value })} />
            </Field>
          </div>
        </div>
        <Field label="Roles you're open to">
          <input value={profile.roles} onChange={(e) => setProfile({ ...profile, roles: e.target.value })} />
        </Field>
      </Card>
    </aside>
  );
}
