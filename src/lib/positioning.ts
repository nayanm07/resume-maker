import type { Resume, RoleFocus } from "../types";
import { clone } from "./resume";

type Focus = Exclude<RoleFocus, "balanced">;

export const FOCUS_IDS: RoleFocus[] = ["balanced", "fullstack", "backend", "mobile", "ai"];

export const FOCUS_LABEL: Record<RoleFocus, string> = {
  balanced: "Balanced (general)",
  fullstack: "Full-Stack",
  backend: "Backend",
  mobile: "Mobile",
  ai: "AI / LLM",
};

/** Role title used inside the AI prompt. */
export const FOCUS_ROLE: Record<Focus, string> = {
  fullstack: "Full-Stack Engineer",
  backend: "Backend Engineer",
  mobile: "Mobile Engineer",
  ai: "AI Engineer",
};

/** What to lead with for each role — fed into the role-focus prompt. */
export const FOCUS_GUIDE: Record<Focus, string> = {
  fullstack:
    "Open the headline and summary with end-to-end web product delivery: React / Next.js frontends, Node.js / NestJS APIs, databases and cloud deployment. Mention mobile work only briefly, as extra breadth.",
  backend:
    "Open the headline and summary with backend and API engineering: service and API design, databases, queues, multi-tenancy, reliability and cloud deployment. Mention frontend or mobile work only as supporting context.",
  mobile:
    "Open the headline and summary with mobile apps: shipped and maintained apps, store releases, download counts, native modules, offline-first and real-time features. Present backend work as support for the mobile products.",
  ai:
    "Open the headline and summary with production AI systems: LLMs, RAG (chunking, embeddings, vector search), speech-to-text / text-to-speech, OCR and LLM evaluation, plus the platforms that run them. Present web and mobile work as where AI features were shipped.",
};

/* ------------------------------------------------------------------ */
/* Keyword signals per focus (used for detection AND ordering)         */
/* ------------------------------------------------------------------ */
const SIGNALS: Record<Focus, RegExp[]> = {
  fullstack: [
    /full[\s-]?stack/g, /\breact\b(?!\s*native)/g, /next\.?js/g, /front[\s-]?end/g, /\bweb\b/g,
    /dashboard/g, /\bnode(\.js)?\b/g, /nest\.?js/g, /\bapi/g, /postgres/g, /typescript/g, /saas/g,
  ],
  backend: [
    /back[\s-]?end/g, /\bnode(\.js)?\b/g, /nest\.?js/g, /express/g, /\bapis?\b|\brest\b|openapi|endpoint/g,
    /postgres|mysql|mongo|prisma|database|\bsql\b/g, /redis|bullmq|queue|worker/g, /multi[\s-]?tenant/g,
    /microservice/g, /websocket|socket\.io/g, /docker|\baws\b|ci\/cd|nginx|\bec2\b/g, /\bjwt\b|rbac|auth/g,
  ],
  mobile: [
    /mobile/g, /react\s*native/g, /android/g, /\bios\b/g, /kotlin|swift/g,
    /play\s*(store|console)|google play|app store/g, /downloads?/g, /\bapps?\b/g, /offline/g,
    /native module|broadcast receiver/g, /push notification|\bfcm\b|firebase/g,
  ],
  ai: [
    /\bai\b|artificial intelligence|gen\s?ai/g, /\bllms?\b|\bgpt|openai|gemini/g, /\brag\b|retrieval/g,
    /embedding|vector|pinecone/g, /langchain|chunk/g, /\bstt\b|speech[\s-]to[\s-]text|deepgram/g,
    /\btts\b|text[\s-]to[\s-]speech|elevenlabs/g, /\bocr\b|document intelligence/g, /voice/g,
    /\bnlp\b|sentiment/g, /machine learning|\bml\b/g, /prompt/g,
  ],
};

function score(text: string, focus: Focus): number {
  const t = (text || "").toLowerCase();
  return SIGNALS[focus].reduce((n, re) => n + (t.match(re)?.length ?? 0), 0);
}

/* ------------------------------------------------------------------ */
/* Detection from the target role + JD                                 */
/* ------------------------------------------------------------------ */
export function detectFocus(target: string, jd: string): RoleFocus {
  const head = `${target}\n${(jd || "").split("\n").slice(0, 4).join("\n")}`.toLowerCase();

  // 1) an explicit job title wins
  if (/full[\s-]?stack/.test(head)) return "fullstack";
  if (/\b(ai|ml|llm|gen\s?ai|machine learning)\b[^\n]{0,25}\b(engineer|developer)\b|\bprompt engineer/.test(head)) return "ai";
  if (/react\s*native|\bmobile\b|\bandroid\b|\bios\b|\bflutter\b/.test(head)) return "mobile";
  if (/back[\s-]?end|\bnode\.?js\b[^\n]{0,20}\b(engineer|developer)\b|\bapi (engineer|developer)\b/.test(head)) return "backend";

  // 2) otherwise weigh keywords across the JD (target counts triple)
  const text = `${target} ${target} ${target}\n${jd}`;
  const scores = (Object.keys(SIGNALS) as Focus[])
    .map((f) => ({ f, s: score(text, f) }))
    .sort((a, b) => b.s - a.s);
  const [best, second] = scores;
  if (!best || best.s < 4) return "balanced";
  // web + backend both strong reads as full-stack
  const be = scores.find((x) => x.f === "backend")!.s;
  const fs = scores.find((x) => x.f === "fullstack")!.s;
  if ((best.f === "backend" || best.f === "fullstack") && fs >= 4 && be >= 4 && /react|next|front/.test(text.toLowerCase()))
    return "fullstack";
  return best.s >= second.s * 1.25 ? best.f : "balanced";
}

/* ------------------------------------------------------------------ */
/* Positioning: variant headline/summary + relevance ordering          */
/* ------------------------------------------------------------------ */

/** Preferred skill-row order per focus, matched against the category label. */
const CATEGORY_ORDER: Record<Focus, RegExp[]> = {
  fullstack: [/lang|program/, /front/, /back/, /data|sql/, /cloud|devops/, /\bai\b|\bml\b|voice/, /mobile/, /payment|api/, /test|tool/, /cert/],
  backend:   [/lang|program/, /back/, /data|sql/, /cloud|devops/, /\bai\b|\bml\b|voice/, /front/, /payment|api/, /mobile/, /test|tool/, /cert/],
  mobile:    [/mobile/, /lang|program/, /front/, /back/, /data|sql/, /payment|api/, /cloud|devops/, /\bai\b|\bml\b|voice/, /test|tool/, /cert/],
  ai:        [/\bai\b|\bml\b|voice|llm/, /lang|program/, /back/, /data|sql/, /cloud|devops/, /front/, /mobile/, /payment|api/, /test|tool/, /cert/],
};

/** Stable sort by descending key (ties keep their original order). */
function byScore<T>(arr: T[], key: (x: T) => number): T[] {
  return arr
    .map((x, i) => ({ x, i, k: key(x) }))
    .sort((a, b) => b.k - a.k || a.i - b.i)
    .map((o) => o.x);
}

export function positionResume(base: Resume, focus: RoleFocus): Resume {
  if (focus === "balanced") return base;
  const r = clone(base);
  const s = (text: string) => score(text, focus);

  // 1) hand-written headline + summary for this role, when the resume has one
  const v = base.positioning?.[focus];
  if (v?.title) r.title = v.title;
  if (v?.subtitle) r.subtitle = v.subtitle;
  if (v?.summary?.length) r.summary = [...v.summary];

  // 2) skill rows: known labels by preference, unknown labels in the middle
  const order = CATEGORY_ORDER[focus];
  const rank = (label: string) => {
    const l = label.toLowerCase();
    const i = order.findIndex((re) => re.test(l));
    return i === -1 ? order.length - 2 : i;
  };
  r.skills = r.skills
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(a.c.label) - rank(b.c.label) || a.i - b.i)
    .map((o) => o.c);

  // 3) strengths, tracks, projects and flat bullets by relevance.
  //    Jobs stay in reverse-chronological order — recruiters expect that.
  r.coreStrengths = byScore(r.coreStrengths, s);
  const projText = (p: { title: string; meta?: string; bullets: string[] }) =>
    `${p.title} ${p.meta ?? ""} ${p.bullets.join(" ")}`;
  r.experience = r.experience.map((j) => {
    const job = { ...j };
    if (job.groups) {
      job.groups = byScore(
        job.groups.map((g) => ({ ...g, projects: byScore(g.projects, (p) => s(projText(p))) })),
        (g) => s(`${g.track} ${g.projects.map(projText).join(" ")}`)
      );
    }
    if (job.bullets) job.bullets = byScore(job.bullets, s);
    return job;
  });
  return r;
}
