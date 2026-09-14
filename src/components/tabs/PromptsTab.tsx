import type { PromptKey, PromptTemplates } from "../../types";
import { DEFAULT_PROMPTS, PROMPT_META } from "../../lib/prompts";
import { Button, CopyButton } from "../ui";

/**
 * Full control over every prompt the app sends.
 * Empty / whitespace value = fall back to the built-in default.
 */
export function PromptsTab({
  prompts, setPrompts,
}: {
  prompts: Partial<PromptTemplates>;
  setPrompts: (p: Partial<PromptTemplates>) => void;
}) {
  const value = (k: PromptKey) => prompts[k] ?? DEFAULT_PROMPTS[k];
  const isCustom = (k: PromptKey) =>
    (prompts[k] ?? "").trim() !== "" && prompts[k] !== DEFAULT_PROMPTS[k];

  const customCount = PROMPT_META.filter((m) => isCustom(m.key)).length;

  return (
    <>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <b>AI Prompts</b>
        <span style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <span className="muted">{customCount} customised</span>
          <Button
            size="sm" variant="ghost"
            onClick={() => { if (confirm("Reset ALL prompts to their defaults?")) setPrompts({}); }}
          >
            ↺ Reset all
          </Button>
        </span>
      </div>

      <div className="muted" style={{ marginBottom: 16 }}>
        These are the exact instructions sent to the AI. Edit any of them to change how the app
        behaves — the safety rules ("never invent", "never delete experience") live here too, so
        keep those lines unless you know what you're doing. Placeholders in{" "}
        <code>{"{{BRACES}}"}</code> are filled in automatically. Changes are saved in this browser.
      </div>

      {PROMPT_META.map(({ key, label, help }) => (
        <div key={key} className="sec">
          <h3>
            {label}
            {isCustom(key) && <span className="chip ok" style={{ marginLeft: 6 }}>customised</span>}
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <CopyButton text={value(key)} />
              <Button
                size="sm" variant="ghost"
                disabled={!isCustom(key)}
                onClick={() => { const next = { ...prompts }; delete next[key]; setPrompts(next); }}
              >
                ↺ Default
              </Button>
            </span>
          </h3>
          <div className="hint" style={{ marginTop: 0, marginBottom: 6 }}>{help}</div>
          <textarea
            value={value(key)}
            rows={Math.min(18, Math.max(4, value(key).split("\n").length + 1))}
            style={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12.5 }}
            onChange={(e) => setPrompts({ ...prompts, [key]: e.target.value })}
          />
        </div>
      ))}
    </>
  );
}
