import type { OutputKey, ProviderId, WantMap } from "../types";
import { PROVIDERS } from "./providers";

/** ~4 chars per token is a good rough estimate for English + JSON. */
export const estTokens = (text: string) => Math.ceil((text || "").length / 4);

/** Rough output size (tokens) each selected section costs. */
const OUTPUT_COST: Record<OutputKey, number> = {
  resume: 1400,
  ats: 260,
  email: 620,
  whatsapp: 110,
  dm: 190,
  comment: 80,
  qa: 1100,
};

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  usd: number | null;
  free: boolean;
}

export function estimateCost(
  promptChars: number,
  want: WantMap,
  provider: ProviderId,
  model: string
): CostEstimate {
  const inputTokens = Math.ceil(promptChars / 4);
  const outputTokens = (Object.keys(want) as OutputKey[])
    .filter((k) => want[k])
    .reduce((sum, k) => sum + OUTPUT_COST[k], 0);

  const p = PROVIDERS[provider];
  const free = provider === "groq" || /:free$/.test(model);
  let usd: number | null = null;
  if (!free && p.price) {
    usd = (inputTokens / 1e6) * p.price[0] + (outputTokens / 1e6) * p.price[1];
  }
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, usd, free };
}

export const fmtTokens = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
