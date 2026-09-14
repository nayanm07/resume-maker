import { PROVIDERS } from "./providers";
import type { ProviderId } from "../types";

export interface LlmArgs {
  provider: ProviderId;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature?: number;
}

/** Tolerant JSON parser — strips fences / prose around the object. */
export function parseJSON<T = any>(text: string): T {
  let t = (text || "").trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t) as T;
}

export async function callLLM({
  provider, apiKey, model, system, user, temperature = 0.3,
}: LlmArgs): Promise<string> {
  const p = PROVIDERS[provider];
  if (!apiKey) throw new Error(`Add your ${p.label} API key first.`);
  const mdl = model || p.models[0];

  if (p.kind === "openai") {
    const body: Record<string, unknown> = {
      model: mdl,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
    if (p.json) body.response_format = { type: "json_object" };

    const res = await fetch(p.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`${p.label} API ${res.status}: ${detail}`);
    }
    const j = await res.json();
    return j?.choices?.[0]?.message?.content ?? "";
  }

  // Gemini
  const url = `${p.url}${encodeURIComponent(mdl)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
      generationConfig: { temperature, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Gemini API ${res.status}: ${detail}`);
  }
  const j = await res.json();
  return j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
