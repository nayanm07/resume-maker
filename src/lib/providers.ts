import type { ProviderId } from "../types";

export interface ProviderDef {
  label: string;
  models: string[];
  hint: string;
  url: string;
  kind: "openai" | "gemini";
  /** send response_format:{type:"json_object"} — some gateways reject it */
  json: boolean;
  keyHome: string;
  /** rough $ per 1M tokens [input, output] for the cost estimator */
  price?: [number, number];
}

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  groq: {
    label: "Groq",
    models: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant"],
    hint: "Fastest, generous free tier. Recommended: llama-3.3-70b-versatile",
    url: "https://api.groq.com/openai/v1/chat/completions",
    kind: "openai",
    json: true,
    keyHome: "console.groq.com/keys",
    price: [0, 0],
  },
  openrouter: {
    label: "OpenRouter",
    models: [
      "deepseek/deepseek-chat-v3-0324",
      "deepseek/deepseek-chat-v3-0324:free",
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen-2.5-72b-instruct",
    ],
    hint: "One key, many models. IDs ending in :free cost nothing. Best quality: deepseek-chat-v3-0324",
    url: "https://openrouter.ai/api/v1/chat/completions",
    kind: "openai",
    json: false,
    keyHome: "openrouter.ai/keys",
    price: [0.3, 0.9],
  },
  gemini: {
    label: "Gemini",
    models: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-pro"],
    hint: "Free tier available. Recommended: gemini-2.0-flash",
    url: "https://generativelanguage.googleapis.com/v1beta/models/",
    kind: "gemini",
    json: true,
    keyHome: "aistudio.google.com/apikey",
    price: [0.1, 0.4],
  },
  openai: {
    label: "OpenAI",
    models: ["gpt-4.1-mini", "gpt-4o-mini", "gpt-4.1", "gpt-4o"],
    hint: "Most reliable JSON. Best value: gpt-4.1-mini",
    url: "https://api.openai.com/v1/chat/completions",
    kind: "openai",
    json: true,
    keyHome: "platform.openai.com/api-keys",
    price: [0.4, 1.6],
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];
