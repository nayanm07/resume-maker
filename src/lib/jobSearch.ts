import type { Profile, Resume, RoleFocus } from "../types";
import { scoreFocus } from "./positioning";

type Focus = Exclude<RoleFocus, "balanced">;
export type Freshness = 1 | 3 | 7;

/** Saved search settings (localStorage). Empty/null fields fall back to the resume. */
export interface JobPrefs {
  customRoles: string[];
  /** selected roles; null = the first three suggestions */
  picked: string[] | null;
  /** extra keywords added to hiring-post searches (max 3) */
  skills: string[];
  /** "" = city from the resume */
  location: string;
  remote: boolean;
  /** null = years from My Details */
  years: number | null;
  days: Freshness;
  aiRoles?: string[];
  aiSkills?: string[];
}

export const JOB_PREFS_DEFAULT: JobPrefs = {
  customRoles: [], picked: null, skills: [], location: "", remote: false, years: null, days: 1,
};

/** Titles recruiters actually post on Indian job boards, per role type. */
const ROLE_LIBRARY: Record<Focus, string[]> = {
  fullstack: ["Full Stack Developer", "MERN Stack Developer"],
  backend: ["Node.js Developer", "Backend Developer"],
  mobile: ["React Native Developer", "Mobile App Developer"],
  ai: ["AI Engineer", "Generative AI Developer"],
};

/** "Backend Engineer (Node.js/NestJS)" -> "Backend Engineer" */
export const cleanTerm = (s: string) => (s || "").replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();

export function uniq(xs: string[]): string[] {
  const seen = new Set<string>();
  return xs.filter((x) => {
    const k = x.toLowerCase();
    if (!x || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function evidence(r: Resume): string {
  const parts: string[] = [r.title, r.subtitle, ...r.summary, ...r.skills.flatMap((s) => s.items)];
  r.experience.forEach((j) => {
    parts.push(j.role);
    j.bullets?.forEach((b) => parts.push(b));
    j.groups?.forEach((g) => g.projects.forEach((p) => parts.push(p.title, p.meta ?? "", ...p.bullets)));
  });
  return parts.join("\n");
}

/**
 * Search titles for this resume, most relevant first:
 * AI suggestions → the roles in My Details → the resume title → role types
 * the experience actually supports.
 */
export function suggestRoles(
  r: Resume, profile: Profile, aiRoles: string[] = [], useProfileRoles = true
): string[] {
  const ev = evidence(r);
  const scores = (Object.keys(ROLE_LIBRARY) as Focus[])
    .map((f) => ({ f, s: scoreFocus(ev, f) }))
    .sort((a, b) => b.s - a.s);
  const max = scores[0]?.s ?? 0;
  // a role type needs real evidence — a couple of stray words ("SQL", "dashboard")
  // must not make a data analyst look like a Node.js developer
  const supported = scores.filter((x) => x.s >= Math.max(6, max * 0.25)).map((x) => x.f);
  // one title per supported role type first, then the second titles, so every
  // direction the resume supports is represented
  const fromResume = [0, 1].flatMap((i) => supported.map((f) => ROLE_LIBRARY[f][i]).filter(Boolean));
  const fromProfile = useProfileRoles ? (profile.roles || "").split(/[,;|]/).map(cleanTerm) : [];
  return uniq([...aiRoles.map(cleanTerm), ...fromProfile, ...fromResume, cleanTerm(r.title)]).slice(0, 12);
}

/** The resume's own skills, short enough to be search keywords. */
export function suggestSkills(r: Resume): string[] {
  return uniq(r.skills.flatMap((s) => s.items.map(cleanTerm)).filter((s) => s.length <= 22)).slice(0, 16);
}

export const defaultLocation = (r: Resume) => (r.contact.location || "").split(",")[0].trim() || "India";

export const parseYears = (exp: string) => {
  const m = (exp || "").match(/\d+/);
  return m ? Number(m[0]) : 0;
};

/* ------------------------------------------------------------------ */
/* Search URLs — each platform's own search page, newest first         */
/* ------------------------------------------------------------------ */
export interface SearchLink {
  id: string;
  platform: string;
  group: "jobs" | "posts";
  url: string;
  hint?: string;
}

const enc = encodeURIComponent;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Wellfound only has fixed role pages (verified slugs). */
function wellfoundSlug(role: string): string {
  const r = role.toLowerCase();
  if (/full[\s-]?stack|mern|mean/.test(r)) return "full-stack-engineer";
  if (/android/.test(r)) return "android-developer";
  if (/react\s*native|mobile|ios|flutter/.test(r)) return "mobile-engineer";
  if (/machine learning|\bml\b/.test(r)) return "machine-learning-engineer";
  if (/\bai\b|\bllm|gen\s?ai|generative|artificial intelligence/.test(r)) return "artificial-intelligence-engineer";
  if (/back[\s-]?end|node|nest|\bapi\b/.test(r)) return "backend-engineer";
  return "software-engineer";
}

/** LinkedIn experience-level filter (1 intern, 2 entry, 3 associate, 4 mid-senior, 5 director). */
function linkedinLevels(years: number) {
  if (years <= 1) return "1,2";
  if (years <= 4) return "2,3";
  if (years <= 8) return "3,4";
  return "4,5";
}

export function buildLinks(
  role: string,
  p: { location: string; remote: boolean; years: number; days: Freshness; skills: string[] }
): SearchLink[] {
  const city = p.location.trim() || "India";
  const countryWide = /^india$/i.test(city);
  const place = p.remote ? "remote" : city;
  const extra = p.skills.slice(0, 3).map((s) => `"${s}"`).join(" ");
  const out: SearchLink[] = [];

  // ---- job boards ----
  const liLocation = p.remote && !countryWide ? "India" : city; // remote: search the whole country
  out.push({
    id: "linkedin", platform: "LinkedIn Jobs", group: "jobs",
    url: `https://www.linkedin.com/jobs/search/?keywords=${enc(role)}&location=${enc(liLocation)}` +
      `&f_TPR=r${p.days * 86400}&sortBy=DD&f_E=${enc(linkedinLevels(p.years))}${p.remote ? "&f_WT=2" : ""}`,
  });

  const nPath = p.remote || countryWide ? `${slug(role)}-jobs` : `${slug(role)}-jobs-in-${slug(city)}`;
  const nq = new URLSearchParams({ k: role, experience: String(p.years), jobAge: String(p.days) });
  if (!p.remote && !countryWide) nq.set("l", city);
  if (p.remote) nq.set("wfhType", "2");
  out.push({ id: "naukri", platform: "Naukri", group: "jobs", url: `https://www.naukri.com/${nPath}?${nq}` });

  const iq = new URLSearchParams({ q: role, l: p.remote ? "Remote" : countryWide ? "" : city, fromage: String(p.days), sort: "date" });
  out.push({ id: "indeed", platform: "Indeed", group: "jobs", url: `https://in.indeed.com/jobs?${iq}` });

  const wf = wellfoundSlug(role);
  out.push({
    id: "wellfound", platform: "Wellfound", group: "jobs", hint: "startups · no date filter",
    url: p.remote ? `https://wellfound.com/role/r/${wf}` : `https://wellfound.com/role/l/${wf}/${slug(city)}`,
  });

  const fq = new URLSearchParams({ query: role });
  if (!p.remote && !countryWide) fq.set("locations", city);
  out.push({ id: "foundit", platform: "foundit", group: "jobs", hint: "no date filter", url: `https://www.foundit.in/srp/results?${fq}` });

  const chip = p.days === 1 ? "today" : p.days === 3 ? "3days" : "week";
  out.push({
    id: "googlejobs", platform: "Google Jobs", group: "jobs", hint: "all boards at once",
    url: `https://www.google.com/search?q=${enc(`${role} jobs ${p.remote ? "remote India" : city}`)}&ibp=htl;jobs&htichips=date_posted:${chip}`,
  });

  // ---- hiring posts ----
  const postQuery = `hiring "${role}" ${place}${extra ? ` ${extra}` : ""}`;
  out.push({
    id: "liposts", platform: "LinkedIn posts", group: "posts", hint: "log in to LinkedIn",
    url: `https://www.linkedin.com/search/results/content/?keywords=${enc(postQuery)}` +
      `&datePosted=${enc(`"${p.days === 1 ? "past-24h" : "past-week"}"`)}&sortBy=${enc('"date_posted"')}`,
  });
  out.push({
    id: "googleposts", platform: "LinkedIn posts via Google", group: "posts", hint: "no login needed",
    url: `https://www.google.com/search?q=${enc(`site:linkedin.com/posts ("hiring" OR "we are hiring") "${role}" ${place}${extra ? ` ${extra}` : ""}`)}` +
      `&tbs=qdr:${p.days === 1 ? "d" : "w"}`,
  });
  out.push({
    id: "x", platform: "X (Twitter)", group: "posts", hint: "live",
    url: `https://x.com/search?q=${enc(`(hiring OR "we're hiring") "${role}" ${place}`)}&f=live`,
  });

  return out;
}

/** The boolean query shown for copy-paste into any site's search box. */
export const postQueryText = (role: string, place: string, skills: string[]) =>
  `hiring "${role}" ${place}${skills.length ? " " + skills.slice(0, 3).map((s) => `"${s}"`).join(" ") : ""}`;
