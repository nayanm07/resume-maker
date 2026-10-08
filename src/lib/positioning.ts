import type { Resume, RoleFocus } from "../types";
import { clone } from "./resume";

type Focus = Exclude<RoleFocus, "balanced">;
type Discipline = "web" | "backend" | "mobile" | "ai";

export const FOCUS_IDS: RoleFocus[] = ["balanced", "fullstack", "fsmobile", "fsai", "ai", "mobile", "backend"];

/** Guards a stored preference: a build may have saved an id that no longer exists. */
export const isFocus = (v: unknown): v is RoleFocus => FOCUS_IDS.includes(v as RoleFocus);

export const FOCUS_LABEL: Record<RoleFocus, string> = {
  balanced: "Universal (everything)",
  fullstack: "Full Stack",
  fsmobile: "Full Stack Mobile",
  fsai: "Full Stack AI",
  ai: "AI Developer",
  mobile: "Mobile App Developer",
  backend: "Backend",
};

/** Role title used inside the AI prompt. */
export const FOCUS_ROLE: Record<Focus, string> = {
  fullstack: "Full Stack Developer",
  fsmobile: "Full Stack Mobile Developer",
  fsai: "Full Stack AI Engineer",
  ai: "AI Developer",
  mobile: "Mobile App Developer",
  backend: "Backend Engineer",
};

/** What to lead with for each role — fed into the role-focus prompt. */
export const FOCUS_GUIDE: Record<Focus, string> = {
  fullstack:
    "Open the headline and summary with end-to-end web product delivery: React / Next.js frontends, Node.js / NestJS APIs, databases and cloud deployment. Mention mobile work only briefly, as extra breadth.",
  fsmobile:
    "Open the headline and summary with mobile products owned end to end: the shipped apps, native modules, offline-first and real-time features, AND the backend APIs, databases and deployments built behind them. Give the app and its server side equal weight; web dashboards are supporting context.",
  fsai:
    "Open the headline and summary with AI products built end to end: LLMs, RAG (chunking, embeddings, vector search), speech-to-text / text-to-speech, OCR and LLM evaluation, AND the APIs and product UIs that deliver them to users. Present mobile work only as another place AI features were shipped.",
  ai:
    "Open the headline and summary with the AI systems themselves: LLMs, RAG (chunking, embeddings, vector search), LLM evaluation, speech-to-text / text-to-speech pipelines and OCR, and the backends that run them in production. Keep the candidate's real languages and frameworks exactly as the resume states them — never restate the stack as Python or any framework the resume does not show. Web and mobile work appear only as where AI features were shipped.",
  mobile:
    "Open the headline and summary with mobile apps: shipped and maintained apps, store releases, download counts, native modules, offline-first and real-time features. Present backend work as support for the mobile products.",
  backend:
    "Open the headline and summary with backend and API engineering: service and API design, databases, queues, multi-tenancy, reliability and cloud deployment. Mention frontend or mobile work only as supporting context.",
};

/* ------------------------------------------------------------------ */
/* Signals per discipline, and how much each role cares about each     */
/* ------------------------------------------------------------------ */
const SIGNALS: Record<Discipline, RegExp[]> = {
  web: [
    /\breact\b(?!\s*native)/g, /next\.?js/g, /front[\s-]?end/g, /\bweb\b/g, /dashboard/g,
    /redux|\brtk\b/g, /\bhtml\b|\bcss\b|tailwind/g, /\bssr\b|\bseo\b|responsive/g, /admin/g,
  ],
  backend: [
    /back[\s-]?end/g, /\bnode(\.js)?\b/g, /nest\.?js/g, /express/g, /python|fastapi|django|flask/g, /\bapis?\b|\brest\b|openapi|endpoint/g,
    /postgres|mysql|mongo|prisma|database|\bsql\b/g, /redis|bullmq|queue|worker/g, /tenan/g,
    /microservice/g, /websocket|socket\.io/g, /docker|\baws\b|ci\/cd|nginx|\bec2\b/g,
    // anchored: bare /auth/ also matches "authored a developer reference"
    /\bjwt\b|rbac|\bauth(entication|orization)?\b/g,
    /webhook|migration|caching|idempotent/g,
  ],
  mobile: [
    /mobile/g, /react\s*native/g, /android/g, /\bios\b/g, /kotlin|swift/g,
    /play\s*(store|console)|google play|app store/g, /downloads?/g, /\bapps?\b/g, /offline|sqlite/g,
    /native module|broadcast receiver|foreground service/g, /push notification|\bfcm\b|firebase/g,
    /admob|google maps|mid-range devices/g,
  ],
  ai: [
    /\bai\b|artificial intelligence|gen\s?ai/g, /\bllms?\b|\bgpt|openai|gemini/g, /\brag\b|retrieval/g,
    /embedding|vector|pinecone/g, /langchain|chunk/g, /\bstt\b|speech[\s-]to[\s-]text|deepgram/g,
    /\btts\b|text[\s-]to[\s-]speech|elevenlabs/g, /\bocr\b|document intelligence/g,
    // anchored: bare /voice/ also matches "invoice", which made billing look like voice AI
    /\bvoice/g,
    /\bnlp\b|sentiment|emotion/g, /machine learning|\bml\b/g, /prompt/g,
  ],
};

/**
 * A role is a mix of disciplines, not a single keyword list. "Full Stack
 * Mobile" wants the app and the server behind it; "Mobile App Developer"
 * wants the app and treats the server as context. The weights say how much
 * one matching word of each discipline is worth to that role.
 */
const WEIGHTS: Record<Focus, Record<Discipline, number>> = {
  fullstack: { web: 1.0, backend: 1.0, mobile: 0.2, ai: 0.3 },
  fsmobile:  { web: 0.35, backend: 0.75, mobile: 1.0, ai: 0.2 },
  fsai:      { web: 0.55, backend: 0.6, mobile: 0.1, ai: 1.0 },
  ai:        { web: 0.15, backend: 0.45, mobile: 0.1, ai: 1.0 },
  mobile:    { web: 0.1, backend: 0.15, mobile: 1.0, ai: 0.1 },
  backend:   { web: 0.2, backend: 1.0, mobile: 0.1, ai: 0.3 },
};

const DISCIPLINES = Object.keys(SIGNALS) as Discipline[];

function count(text: string, d: Discipline): number {
  const t = (text || "").toLowerCase();
  return SIGNALS[d].reduce((n, re) => n + (t.match(re)?.length ?? 0), 0);
}

function score(text: string, focus: Focus): number {
  const w = WEIGHTS[focus];
  return DISCIPLINES.reduce((n, d) => n + w[d] * count(text, d), 0);
}

/**
 * Relevance of one short passage (a bullet, a title line) to a role, with each
 * discipline capped at two hits. Uncapped, a bullet that lists eight backend
 * tools outvotes one that describes a single hard mobile problem — keyword
 * density would be mistaken for relevance.
 */
function passageScore(text: string, focus: Focus): number {
  const w = WEIGHTS[focus];
  return DISCIPLINES.reduce((n, d) => n + w[d] * Math.min(2, count(text, d)), 0);
}

/** Relevance of `text` to one role (exported for job search). */
export function scoreFocus(text: string, focus: Focus): number {
  return score(text, focus);
}

/* ------------------------------------------------------------------ */
/* Detection from the target role + JD                                 */
/* ------------------------------------------------------------------ */
const MOBILE_WORD = /react\s*native|\bmobile\b|\bandroid\b|\bios\b|\bflutter\b/;
const AI_WORD = /\b(ai|ml|llms?|gen\s?ai|generative|machine learning)\b/;

export function detectFocus(target: string, jd: string): RoleFocus {
  const jdLines = (jd || "").split("\n").filter((l) => l.trim());
  const head = `${target}\n${jdLines.slice(0, 4).join("\n")}`.toLowerCase();
  // the title itself: what the user typed, or failing that the JD's first line
  const title = (target.trim() || jdLines[0] || "").toLowerCase();

  const text = `${target} ${target} ${target}\n${jd}`;
  const c = Object.fromEntries(DISCIPLINES.map((d) => [d, count(text, d)])) as Record<Discipline, number>;
  const total = c.web + c.backend + c.mobile + c.ai;
  const share = (d: Discipline) => (total ? c[d] / total : 0);

  // 1) an explicit job title wins; the JD body only picks the full-stack flavour
  if (/full[\s-]?stack/.test(head)) {
    if (AI_WORD.test(title) || share("ai") >= 0.3) return "fsai";
    if (MOBILE_WORD.test(title) || share("mobile") >= 0.3) return "fsmobile";
    return "fullstack";
  }
  if (/\b(ai|ml|llm|gen\s?ai|machine learning)\b[^\n]{0,25}\b(engineer|developer)\b|\bprompt engineer/.test(head)) return "ai";
  if (MOBILE_WORD.test(head)) {
    // a mobile title that also asks for real server work is the full-stack flavour
    return share("backend") >= 0.4 ? "fsmobile" : "mobile";
  }
  if (/back[\s-]?end|\bnode\.?js\b[^\n]{0,20}\b(engineer|developer)\b|\bapi (engineer|developer)\b/.test(head)) return "backend";

  // 2) otherwise weigh keywords across the JD (target counts triple)
  if (total < 4) return "balanced";
  // An AI-heavy JD under a general title ("Software Developer") that also names
  // a frontend and a backend technology wants the whole product built, not only
  // the model side. Counts, not shares: one "React.js" in a skills list is a
  // requirement even when AI words outnumber it.
  if (share("ai") >= 0.35) return c.web >= 1 && c.backend >= 2 ? "fsai" : "ai";
  if (share("mobile") >= 0.4) return share("backend") + share("web") >= 0.3 ? "fsmobile" : "mobile";
  if (share("backend") >= 0.55 && share("web") < 0.15) return "backend";
  if (share("web") + share("backend") >= 0.6 && c.web >= 2 && c.backend >= 2) return "fullstack";
  return "balanced";
}

/* ------------------------------------------------------------------ */
/* Positioning: variant headline/summary + relevance ordering          */
/* ------------------------------------------------------------------ */

/** Preferred skill-row order per focus, matched against the category label. */
const CATEGORY_ORDER: Record<Focus, RegExp[]> = {
  fullstack: [/lang|program/, /front/, /back/, /data|sql/, /cloud|devops/, /\bai\b|\bml\b|voice/, /mobile/, /payment|api/, /test|tool/, /cert/],
  fsmobile:  [/mobile/, /lang|program/, /back/, /front/, /data|sql/, /cloud|devops/, /payment|api/, /\bai\b|\bml\b|voice/, /test|tool/, /cert/],
  fsai:      [/\bai\b|\bml\b|voice|llm/, /lang|program/, /back/, /front/, /data|sql/, /cloud|devops/, /payment|api/, /mobile/, /test|tool/, /cert/],
  ai:        [/\bai\b|\bml\b|voice|llm/, /lang|program/, /back/, /data|sql/, /cloud|devops/, /front/, /payment|api/, /mobile/, /test|tool/, /cert/],
  mobile:    [/mobile/, /lang|program/, /front/, /payment|api/, /back/, /data|sql/, /cloud|devops/, /\bai\b|\bml\b|voice/, /test|tool/, /cert/],
  backend:   [/lang|program/, /back/, /data|sql/, /cloud|devops/, /\bai\b|\bml\b|voice/, /front/, /payment|api/, /mobile/, /test|tool/, /cert/],
};

/** Stable sort by descending key (ties keep their original order). */
function byScore<T>(arr: T[], key: (x: T) => number): T[] {
  return arr
    .map((x, i) => ({ x, i, k: key(x) }))
    .sort((a, b) => b.k - a.k || a.i - b.i)
    .map((o) => o.x);
}

/* ------------------------------------------------------------------ */
/* Depth: how much of the experience a role version shows              */
/* ------------------------------------------------------------------ */
export type Depth = "tight" | "focused" | "full";

export const DEPTHS: { id: Depth; label: string; note: string }[] = [
  { id: "tight", label: "One page", note: "Only the strongest bullets for this role, no Core Strengths. Built to fit a single page — check the page meter below." },
  { id: "focused", label: "Focused", note: "Keeps the bullets that matter most for this role and folds the rest into an \"Also\" line. Nothing is deleted from My Resume." },
  { id: "full", label: "Full", note: "Every bullet stays. The role only changes the headline, summary, strengths and what comes first." },
];

export const isDepth = (v: unknown): v is Depth => DEPTHS.some((d) => d.id === v);

/**
 * What a role version may spend. `budget` is bullets across the whole
 * experience section; `perUnit` caps any one project however relevant;
 * `strengths` is how many Core Strengths lines survive — that section restates
 * the summary, so the tightest level gives its space back to the experience.
 */
const PLAN: Record<Depth, { budget: number; perUnit: number; strengths: number } | null> = {
  tight: { budget: 11, perUnit: 3, strengths: 0 },
  focused: { budget: 15, perUnit: 4, strengths: 2 },
  full: null,
};

/** Below this share of the top project's relevance, a project folds to its title line. */
const FOLD_BELOW = 0.4;
/** Beyond a project's one guaranteed bullet, a bullet must reach this share of the best bullet's relevance. */
const MIN_BULLET_SHARE = 0.3;
const HAS_METRIC = /\b\d[\d,.]*\s?[KMB]?[+%]/;

/**
 * Cut the experience down to the bullets this role is best served by.
 *
 * The budget is spent globally, not per project: every bullet in the resume
 * competes on (its own relevance) x (its project's relevance), so a strong
 * bullet in a strong project beats a weak one anywhere. Two floors stop the
 * result reading as if history was hidden — a job is never left with nothing,
 * and a project that is at all relevant keeps its best bullet. Projects below
 * that fold to their title line, which still carries the stack and the reach.
 */
function trimToBudget(r: Resume, focus: Focus, budget: number, perUnit: number): void {
  const s = (text: string) => passageScore(text, focus);
  type Unit = { bullets: string[]; header: string; isJob: boolean; set: (b: string[]) => void };
  const units: Unit[] = [];
  for (const job of r.experience) {
    job.groups?.forEach((g) =>
      g.projects.forEach((p) =>
        units.push({
          bullets: p.bullets, isJob: false, header: `${p.title} ${p.meta ?? ""}`,
          set: (b) => { p.bullets = b; },
        })
      )
    );
    if (job.bullets)
      units.push({
        bullets: job.bullets, isJob: true, header: `${job.role} ${job.place ?? ""}`,
        set: (b) => { job.bullets = b; },
      });
  }

  const totalBullets = units.reduce((n, u) => n + u.bullets.length, 0);
  if (totalBullets <= budget) return; // short resume — nothing to cut

  // A project's relevance blends its average bullet with its best one. The
  // average alone stops six bullets counting three times as much as two; the
  // best alone keeps a project alive when one bullet is exactly what the role
  // wants and the other five are not. The title line counts for half: it
  // names the stack and the platform.
  const bulletScore = units.map((u) => u.bullets.map(s));
  const unitScore = units.map((u, ui) => {
    const bs = bulletScore[ui];
    if (!bs.length) return 0.5 * s(u.header);
    const mean = bs.reduce((n, x) => n + x, 0) / bs.length;
    return 0.5 * mean + 0.5 * Math.max(...bs) + 0.5 * s(u.header);
  });
  const top = Math.max(...unitScore, 0.01);
  const rel = unitScore.map((x) => x / top);
  // spare budget is not a reason to print a bullet the role has no use for
  const worthShowing = MIN_BULLET_SHARE * Math.max(...bulletScore.flat(), 0.01);

  // each bullet's own pull: role relevance, a metric, and how early the author
  // placed it — people lead with what they are proudest of
  const value = units.map((u, ui) =>
    u.bullets.map(
      (b, i) => bulletScore[ui][i] + (HAS_METRIC.test(b) ? 0.6 : 0) + 0.6 * (1 - i / u.bullets.length)
    )
  );
  const keep = units.map(() => new Set<number>());
  const bestOf = (ui: number) => value[ui].reduce((best, v, i) => (v > value[ui][best] ? i : best), 0);

  let left = budget;
  // a job is never left empty — that would read as a hidden stretch of history
  units.forEach((u, ui) => {
    if (u.isJob && u.bullets.length) { keep[ui].add(bestOf(ui)); left--; }
  });
  // Then one bullet per relevant project, most relevant first — but stop while
  // enough budget remains for the strongest project to reach its cap. Without
  // that reserve a resume with many projects spends everything on breadth and
  // its best work ends up with a single line, like all the rest.
  const reserve = perUnit - 1;
  units
    .map((u, ui) => ui)
    .filter((ui) => !units[ui].isJob && units[ui].bullets.length && rel[ui] >= FOLD_BELOW)
    .sort((a, b) => rel[b] - rel[a] || a - b)
    .forEach((ui) => {
      if (left > reserve) { keep[ui].add(bestOf(ui)); left--; }
    });

  const pool = units
    .flatMap((u, ui) => u.bullets.map((_, bi) => ({ ui, bi, v: value[ui][bi] * (0.35 + rel[ui]) })))
    .filter((c) => keep[c.ui].size > 0 && !keep[c.ui].has(c.bi) && bulletScore[c.ui][c.bi] >= worthShowing)
    .sort((a, b) => b.v - a.v || a.ui - b.ui || a.bi - b.bi);
  for (const c of pool) {
    if (left <= 0) break;
    if (keep[c.ui].size >= perUnit) continue;
    keep[c.ui].add(c.bi);
    left--;
  }

  // survivors stay in the order the author wrote them
  units.forEach((u, ui) => u.set(u.bullets.filter((_, bi) => keep[ui].has(bi))));
}

export function positionResume(base: Resume, focus: RoleFocus, depth: Depth = "full"): Resume {
  if (focus === "balanced") return base; // the universal resume is shown exactly as written
  const r = clone(base);
  const s = (text: string) => score(text, focus);

  // 1) hand-written headline, summary and strengths for this role, when the resume has them
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

  // 3) strengths: the role's own lines if written, otherwise the base lines by relevance
  r.coreStrengths = v?.strengths?.length ? [...v.strengths] : byScore(r.coreStrengths, s);

  // 4) below Full depth, the version spends a fixed budget on what this role values
  const plan = PLAN[depth];
  if (plan) {
    r.coreStrengths = r.coreStrengths.slice(0, plan.strengths);
    trimToBudget(r, focus, plan.budget, plan.perUnit);
  }

  // 5) tracks, projects and flat bullets by relevance.
  //    Jobs stay in reverse-chronological order — recruiters expect that.
  const projText = (p: { title: string; meta?: string; bullets: string[] }) =>
    `${p.title} ${p.meta ?? ""} ${p.bullets.join(" ")}`;
  r.experience = r.experience.map((j) => {
    const job = { ...j };
    if (job.groups) {
      const withSortedProjects = job.groups.map((g) => ({
        ...g, projects: byScore(g.projects, (p) => s(projText(p))),
      }));
      // tracks that carry their own dates ("… · May 2025 – Oct 2025") are time
      // periods, so they stay chronological; discipline tracks reorder by relevance
      const dated = job.groups.some((g) => /(^|[^0-9])20[0-9]{2}([^0-9]|$)/.test(g.track));
      job.groups = dated
        ? withSortedProjects
        : byScore(withSortedProjects, (g) => s(`${g.track} ${g.projects.map(projText).join(" ")}`));
    }
    if (job.bullets) job.bullets = byScore(job.bullets, s);
    return job;
  });
  return r;
}
